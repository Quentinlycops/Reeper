-- Reeper — table "contracts" (Espace gérant > Gestion des contrats communes)
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.
-- Suit directement le modèle "durci" (pas de suppression possible via la clé publique).

create table if not exists contracts (
  commune text primary key,
  tier text,
  annual_amount numeric default 0,
  contract_start bigint,
  status text,
  renewal_date bigint,
  contacts jsonb default '[]'::jsonb,
  budget_total numeric default 0,
  budget_projects jsonb default '[]'::jsonb,
  postal_address text default '',
  contract_file_url text,
  contract_file_name text,
  satisfaction integer,
  invoices jsonb default '[]'::jsonb,
  journal jsonb default '[]'::jsonb,
  updated_at bigint default 0
);

alter table contracts enable row level security;

drop policy if exists "public access" on contracts;
create policy "public read" on contracts for select using (true);
create policy "public write" on contracts for insert with check (true);
create policy "public update" on contracts for update using (true) with check (true);
