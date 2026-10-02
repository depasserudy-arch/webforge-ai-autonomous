-- Renowation — socle ALSA : offres signées en ligne, encaissements, journal de commission,
-- remontée vers ALSA COCKPIT, documents de chantier et frein anti-abus.
-- Mécanique alignée sur Miroiteries Montoises (offre publique + signature, journal_commission)
-- et Dream Bed (pousser_cockpit signé HMAC, événement « paiement.encaisse »).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;

-- 0. Paramètres --------------------------------------------------------------
-- Valeurs lisibles par l'équipe (taux, conditions…).
create table public.parametres (
  cle text primary key,
  valeur text not null
);
alter table public.parametres enable row level security;
create policy "team reads settings" on public.parametres
  for select to authenticated using ((select public.is_team_member()));
insert into public.parametres (cle, valeur) values
  ('taux_commission', '0.10'),
  ('validite_offre_jours', '30'),
  ('conditions_offre', 'Acompte de 30 % à la signature, solde à la réception des travaux. Prix HTVA, TVA au taux applicable. Offre valable 30 jours.');

-- Secrets du pont : aucune policy, lisibles uniquement par les fonctions SECURITY DEFINER.
create table public.pont_config (
  cle text primary key,
  valeur text not null
);
alter table public.pont_config enable row level security;
revoke all on public.pont_config from anon, authenticated;
-- À renseigner après déploiement (SQL Editor) :
--   insert into public.pont_config values ('plateforme','renowation'),
--     ('url_cockpit','https://<cockpit>/ingest'), ('cle_ingest','<secret partagé>');

-- 1. Frein anti-abus sur les demandes du site --------------------------------
create or replace function public.frein_demandes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.renowation_leads
      where created_at > now() - interval '10 minutes'
        and (lower(email) = lower(new.email) or phone = new.phone)) >= 3 then
    raise exception 'Trop de demandes rapprochées. Merci de nous appeler directement.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.renowation_leads where created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Service momentanément saturé, réessayez dans une minute.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger renowation_leads_frein before insert on public.renowation_leads
  for each row execute function public.frein_demandes();

-- 2. Offres ------------------------------------------------------------------
create sequence public.offres_numero_seq;

create table public.offres (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.renowation_leads(id) on delete restrict,
  numero text not null unique
    default 'REN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.offres_numero_seq')::text, 4, '0'),
  statut text not null default 'brouillon'
    check (statut in ('brouillon', 'envoyee', 'signee', 'refusee', 'annulee')),
  objet text not null default '' check (char_length(objet) <= 300),
  -- [{ "libelle": "...", "quantite": 40, "unite": "m²", "prix_unitaire": 95 }]
  lignes jsonb not null default '[]'::jsonb check (jsonb_typeof(lignes) = 'array'),
  tva_taux numeric not null default 6 check (tva_taux in (0, 6, 21)),
  montant_htva numeric not null default 0,
  montant_tva numeric not null default 0,
  montant_tvac numeric not null default 0,
  conditions text not null default '' check (char_length(conditions) <= 4000),
  jeton text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  valide_jusqu_au date not null default (current_date + 30),
  created_at timestamptz not null default now(),
  envoyee_le timestamptz,
  signee_le timestamptz
);
create index offres_lead_idx on public.offres (lead_id);

-- Totaux recalculés en base (jamais confiés au navigateur) + offre figée après signature.
create or replace function public.offres_calcul()
returns trigger language plpgsql set search_path = '' as $$
declare
  l jsonb;
  total numeric := 0;
begin
  if tg_op = 'UPDATE' and old.statut in ('signee', 'refusee', 'annulee')
     and (new.lignes is distinct from old.lignes or new.tva_taux is distinct from old.tva_taux
          or new.objet is distinct from old.objet or new.conditions is distinct from old.conditions
          or new.statut is distinct from old.statut) then
    raise exception 'Offre % clôturée (%) : elle ne peut plus être modifiée.', old.numero, old.statut;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'envoyee'
     and (new.lignes is distinct from old.lignes or new.tva_taux is distinct from old.tva_taux) then
    raise exception 'Offre % déjà envoyée : créez une nouvelle version.', old.numero;
  end if;
  -- La signature ne passe que par signer_offre().
  if new.statut = 'signee' and (tg_op = 'INSERT' or old.statut <> 'signee')
     and coalesce(current_setting('renowation.signature_en_cours', true), '') <> 'oui' then
    raise exception 'Une offre ne peut être signée que par le client, via son lien.';
  end if;

  for l in select * from jsonb_array_elements(new.lignes) loop
    if coalesce((l ->> 'quantite')::numeric, -1) < 0 or coalesce((l ->> 'prix_unitaire')::numeric, -1) < 0
       or coalesce(l ->> 'libelle', '') = '' then
      raise exception 'Ligne d''offre invalide : %', l;
    end if;
    total := total + round((l ->> 'quantite')::numeric * (l ->> 'prix_unitaire')::numeric, 2);
  end loop;
  new.montant_htva := total;
  new.montant_tva := round(total * new.tva_taux / 100, 2);
  new.montant_tvac := new.montant_htva + new.montant_tva;
  if new.statut = 'envoyee' and (tg_op = 'INSERT' or old.statut = 'brouillon') then
    if total <= 0 then raise exception 'Une offre vide ne peut pas être envoyée.'; end if;
    new.envoyee_le := now();
  end if;
  return new;
end;
$$;
create trigger offres_calcul before insert or update on public.offres
  for each row execute function public.offres_calcul();

-- Le pipeline suit l'offre automatiquement.
create or replace function public.offres_suivi_lead()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.statut = 'envoyee' and (tg_op = 'INSERT' or old.statut <> 'envoyee') then
    update public.renowation_leads set status = 'devis' where id = new.lead_id and status in ('nouveau', 'contacte', 'visite');
  elsif new.statut = 'signee' and old.statut <> 'signee' then
    update public.renowation_leads set status = 'signe', amount_signed = new.montant_htva where id = new.lead_id;
  end if;
  return new;
end;
$$;
create trigger offres_suivi_lead after insert or update on public.offres
  for each row execute function public.offres_suivi_lead();

alter table public.offres enable row level security;
create policy "team reads offers" on public.offres for select to authenticated using ((select public.is_team_member()));
create policy "team writes offers" on public.offres for insert to authenticated with check ((select public.is_team_member()));
create policy "team updates offers" on public.offres for update to authenticated
  using ((select public.is_team_member())) with check ((select public.is_team_member()));
revoke all on public.offres from anon;

-- 3. Signature électronique simple -------------------------------------------
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null unique references public.offres(id) on delete restrict,
  nom text not null check (char_length(nom) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  contenu jsonb not null,            -- copie figée de l'offre au moment de la signature
  empreinte text not null,           -- SHA-256 du contenu : prouve que l'offre n'a pas bougé
  signature text not null check (char_length(signature) <= 300000), -- tracé (data URL PNG)
  accepte_conditions boolean not null check (accepte_conditions),
  ip_tronquee text,
  agent text check (char_length(agent) <= 400),
  signe_le timestamptz not null default now()
);
alter table public.signatures enable row level security;
create policy "team reads signatures" on public.signatures for select to authenticated using ((select public.is_team_member()));
revoke all on public.signatures from anon;
revoke insert, update, delete on public.signatures from authenticated;

-- Lecture publique d'une offre par son lien secret.
create or replace function public.offre_publique(p_jeton text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'numero', o.numero, 'statut', o.statut, 'objet', o.objet, 'lignes', o.lignes,
    'tva_taux', o.tva_taux, 'montant_htva', o.montant_htva, 'montant_tva', o.montant_tva,
    'montant_tvac', o.montant_tvac, 'conditions', o.conditions,
    'valide_jusqu_au', o.valide_jusqu_au, 'envoyee_le', o.envoyee_le, 'signee_le', o.signee_le,
    'expiree', o.valide_jusqu_au < current_date,
    'client', jsonb_build_object('nom', l.name, 'commune', l.city),
    'signataire', s.nom
  )
  from public.offres o
  join public.renowation_leads l on l.id = o.lead_id
  left join public.signatures s on s.offre_id = o.id
  where o.jeton = p_jeton and o.statut in ('envoyee', 'signee') and char_length(p_jeton) = 48;
$$;

create or replace function public.signer_offre(
  p_jeton text, p_nom text, p_email text, p_signature text, p_accepte boolean, p_agent text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.offres;
  snap jsonb;
  ip text;
begin
  select * into o from public.offres where jeton = p_jeton and char_length(p_jeton) = 48 for update;
  if not found then raise exception 'Offre introuvable.'; end if;
  if o.statut = 'signee' then raise exception 'Cette offre est déjà signée.'; end if;
  if o.statut <> 'envoyee' then raise exception 'Cette offre n''est pas ouverte à la signature.'; end if;
  if o.valide_jusqu_au < current_date then raise exception 'Cette offre a expiré : contactez-nous pour la renouveler.'; end if;
  if not coalesce(p_accepte, false) then raise exception 'Les conditions doivent être acceptées.'; end if;
  if char_length(trim(coalesce(p_nom, ''))) < 2 then raise exception 'Nom du signataire requis.'; end if;
  if coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail invalide.'; end if;
  if coalesce(p_signature, '') not like 'data:image/png;base64,%' then raise exception 'Signature manuscrite requise.'; end if;

  snap := public.offre_publique(p_jeton) - 'signataire' - 'expiree';
  ip := split_part(coalesce(nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-forwarded-for', ''), ',', 1);
  ip := nullif(regexp_replace(ip, '\.\d+$', '.0'), '');  -- IPv4 tronquée (RGPD)

  insert into public.signatures (offre_id, nom, email, contenu, empreinte, signature, accepte_conditions, ip_tronquee, agent)
  values (o.id, trim(p_nom), lower(trim(p_email)), snap,
          encode(extensions.digest(snap::text, 'sha256'), 'hex'),
          p_signature, true, ip, left(p_agent, 400));

  perform set_config('renowation.signature_en_cours', 'oui', true);
  update public.offres set statut = 'signee', signee_le = now() where id = o.id;
  perform set_config('renowation.signature_en_cours', '', true);

  perform public.pousser_cockpit('devis.signe', o.numero, round(o.montant_htva * 100)::bigint,
    jsonb_build_object('libelle', o.numero || ' ' || o.objet));
  return jsonb_build_object('numero', o.numero, 'signee_le', now());
end;
$$;

-- 4. Encaissements & journal de commission (sur l'ENCAISSÉ) -------------------
create table public.encaissements (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references public.offres(id) on delete restrict,
  montant numeric not null check (montant <> 0),  -- négatif = remboursement / avoir
  encaisse_le date not null default current_date,
  mode text not null default 'virement' check (mode in ('virement', 'carte', 'especes', 'autre')),
  note text not null default '' check (char_length(note) <= 1000),
  cree_par text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now()
);
create index encaissements_offre_idx on public.encaissements (offre_id);

create or replace function public.encaissements_controle()
returns trigger language plpgsql set search_path = '' as $$
declare st text;
begin
  select statut into st from public.offres where id = new.offre_id;
  if st is distinct from 'signee' then
    raise exception 'Un encaissement ne peut être lié qu''à une offre signée.';
  end if;
  return new;
end;
$$;
create trigger encaissements_controle before insert on public.encaissements
  for each row execute function public.encaissements_controle();

alter table public.encaissements enable row level security;
create policy "team reads payments" on public.encaissements for select to authenticated using ((select public.is_team_member()));
create policy "team records payments" on public.encaissements for insert to authenticated with check ((select public.is_team_member()));
-- Pas d'update ni de delete : on corrige par une écriture négative (traçabilité).
revoke all on public.encaissements from anon;
revoke update, delete on public.encaissements from authenticated;

create table public.journal_commission (
  id uuid primary key default gen_random_uuid(),
  encaissement_id uuid not null unique references public.encaissements(id) on delete restrict,
  reference text not null,
  montant_encaisse numeric not null,
  taux numeric not null,
  commission numeric not null,
  encaisse_le date not null,
  cree_le timestamptz not null default now()
);
alter table public.journal_commission enable row level security;
create policy "team reads commission" on public.journal_commission for select to authenticated using ((select public.is_team_member()));
revoke all on public.journal_commission from anon;
revoke insert, update, delete on public.journal_commission from authenticated;

create or replace function public.encaissements_commission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  taux numeric := coalesce((select valeur::numeric from public.parametres where cle = 'taux_commission'), 0.10);
  num text := (select numero from public.offres where id = new.offre_id);
begin
  insert into public.journal_commission (encaissement_id, reference, montant_encaisse, taux, commission, encaisse_le)
  values (new.id, num, new.montant, taux, round(new.montant * taux, 2), new.encaisse_le);
  perform public.pousser_cockpit('paiement.encaisse', num || '#' || new.id::text, round(new.montant * 100)::bigint,
    jsonb_build_object('libelle', num, 'taux_commission', taux, 'commission', round(new.montant * taux, 2)));
  return new;
end;
$$;
create trigger encaissements_commission after insert on public.encaissements
  for each row execute function public.encaissements_commission();

-- 5. Pont vers ALSA COCKPIT (même contrat que Dream Bed) ----------------------
create or replace function public.pousser_cockpit(
  p_evenement text, p_reference text, p_montant_centimes bigint,
  p_charge jsonb default '{}'::jsonb, p_origine text default null)
returns void language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare url text; nom text; secret text; corps jsonb; sig text;
begin
  select valeur into url from public.pont_config where cle = 'url_cockpit';
  select valeur into nom from public.pont_config where cle = 'plateforme';
  select valeur into secret from public.pont_config where cle = 'cle_ingest';
  if url is null or secret is null then return; end if;
  corps := jsonb_build_object(
    'plateforme', coalesce(nom, 'renowation'), 'evenement', p_evenement, 'reference_locale', p_reference,
    'montant_centimes', p_montant_centimes, 'origine', p_origine,
    'charge_utile', coalesce(p_charge, '{}'::jsonb) || jsonb_build_object('emetteur', 'renowation'),
    'horodatage', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  sig := encode(extensions.hmac(corps::text, secret, 'sha256'), 'hex');
  perform net.http_post(url := url, body := corps,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-signature', sig),
    timeout_milliseconds := 5000);
exception when others then
  -- Le cockpit ne doit jamais bloquer une signature ou un encaissement.
  raise warning 'pousser_cockpit: %', sqlerrm;
end;
$$;

-- 6. Documents & photos de chantier ------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.renowation_leads(id) on delete cascade,
  type text not null default 'photo' check (type in ('photo', 'plan', 'devis', 'facture', 'autre')),
  nom text not null check (char_length(nom) <= 200),
  chemin text not null unique,
  taille integer not null check (taille between 1 and 20000000),
  mime text not null,
  legende text not null default '' check (char_length(legende) <= 300),
  depose_par text default (auth.jwt() ->> 'email'),
  cree_le timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "team reads docs" on public.documents for select to authenticated using ((select public.is_team_member()));
create policy "team adds docs" on public.documents for insert to authenticated with check ((select public.is_team_member()));
create policy "team removes docs" on public.documents for delete to authenticated using ((select public.is_team_member()));
revoke all on public.documents from anon;

insert into storage.buckets (id, name, public, file_size_limit)
values ('chantiers', 'chantiers', false, 20000000)
on conflict (id) do nothing;
create policy "team reads chantier files" on storage.objects for select to authenticated
  using (bucket_id = 'chantiers' and (select public.is_team_member()));
create policy "team uploads chantier files" on storage.objects for insert to authenticated
  with check (bucket_id = 'chantiers' and (select public.is_team_member()));
create policy "team deletes chantier files" on storage.objects for delete to authenticated
  using (bucket_id = 'chantiers' and (select public.is_team_member()));

-- 7. Droits sur les fonctions ------------------------------------------------
revoke all on function public.offre_publique(text) from public;
revoke all on function public.signer_offre(text, text, text, text, boolean, text) from public;
revoke all on function public.pousser_cockpit(text, text, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.frein_demandes() from public, anon, authenticated;
revoke all on function public.encaissements_commission() from public, anon, authenticated;
revoke all on function public.offres_suivi_lead() from public, anon, authenticated;
grant execute on function public.offre_publique(text) to anon, authenticated;
grant execute on function public.signer_offre(text, text, text, text, boolean, text) to anon, authenticated;
grant select, insert, update on public.offres to authenticated;
grant select, insert on public.encaissements to authenticated;
grant select on public.signatures, public.journal_commission, public.parametres to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant usage on sequence public.offres_numero_seq to authenticated;
