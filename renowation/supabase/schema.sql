-- Table des demandes de devis Renowation (cockpit ALSA)
create table if not exists public.renowation_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  city text not null default '',
  service text not null,
  surface numeric not null default 0,
  timing text not null default '',
  budget_low numeric not null default 0,
  budget_high numeric not null default 0,
  message text not null default '',
  status text not null default 'nouveau'
    check (status in ('nouveau','contacte','visite','devis','signe','perdu')),
  amount_signed numeric
);

alter table public.renowation_leads enable row level security;

-- Le site public peut uniquement CRÉER une demande.
create policy "public insert" on public.renowation_leads
  for insert to anon with check (status = 'nouveau' and amount_signed is null);

-- Lecture / mise à jour réservées aux utilisateurs authentifiés (équipe Renowation & ALSA).
create policy "team read" on public.renowation_leads
  for select to authenticated using (true);
create policy "team update" on public.renowation_leads
  for update to authenticated using (true) with check (true);
