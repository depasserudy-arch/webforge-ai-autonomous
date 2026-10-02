-- Renowation — demandes de devis + accès équipe (cockpit ALSA)

-- 1. Équipe autorisée à accéder au cockpit -----------------------------------
create table public.team_members (
  email text primary key check (email = lower(email)),
  role text not null default 'commercial' check (role in ('admin', 'commercial')),
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;
revoke all on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated;

create policy "team reads team" on public.team_members
  for select to authenticated using ((select public.is_team_member()));

-- 2. Demandes de devis ----------------------------------------------------
create table public.renowation_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (char_length(phone) between 6 and 40),
  city text not null default '' check (char_length(city) <= 120),
  service text not null check (service in ('renovation','toiture','facade','isolation','salle-de-bain','cuisine','interieur')),
  surface numeric not null default 0 check (surface >= 0 and surface <= 100000),
  timing text not null default '' check (char_length(timing) <= 60),
  budget_low numeric not null default 0 check (budget_low >= 0),
  budget_high numeric not null default 0 check (budget_high >= budget_low),
  message text not null default '' check (char_length(message) <= 4000),
  status text not null default 'nouveau'
    check (status in ('nouveau','contacte','visite','devis','signe','perdu')),
  amount_signed numeric check (amount_signed is null or amount_signed >= 0),
  notes text not null default '' check (char_length(notes) <= 8000)
);

create index renowation_leads_created_at_idx on public.renowation_leads (created_at desc);
create index renowation_leads_status_idx on public.renowation_leads (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger renowation_leads_touch before update on public.renowation_leads
  for each row execute function public.touch_updated_at();

alter table public.renowation_leads enable row level security;

-- Le site public peut uniquement CRÉER une demande « nouvelle », sans champs internes.
create policy "public creates lead" on public.renowation_leads
  for insert to anon, authenticated
  with check (status = 'nouveau' and amount_signed is null and notes = '');

-- Seuls les membres de l'équipe lisent et font avancer le pipeline.
create policy "team reads leads" on public.renowation_leads
  for select to authenticated using ((select public.is_team_member()));
create policy "team updates leads" on public.renowation_leads
  for update to authenticated
  using ((select public.is_team_member()))
  with check ((select public.is_team_member()));

-- Droits minimaux : le public n'a que l'insertion.
revoke all on public.renowation_leads from anon;
grant insert on public.renowation_leads to anon;
grant select, insert, update on public.renowation_leads to authenticated;
revoke all on public.team_members from anon;
grant select on public.team_members to authenticated;

-- 3. Membres de l'équipe -------------------------------------------------
-- À exécuter après le déploiement (SQL Editor), une ligne par personne :
--   insert into public.team_members (email, role) values ('prenom@domaine.be', 'admin');
-- puis inviter la même adresse dans Authentication → Users → Invite.
