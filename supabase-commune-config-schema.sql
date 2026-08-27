-- Reeper — persistance réelle de la Configuration commune (Général, Catégories,
-- Services, Statuts, Messages automatiques) + service/notification par agent.
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

create table if not exists commune_config (
  commune text primary key,
  general jsonb default '{}'::jsonb,
  cats_off jsonb default '[]'::jsonb,
  cat_overrides jsonb default '{}'::jsonb,
  cat_extra jsonb default '[]'::jsonb,
  services jsonb default '[]'::jsonb,
  status_visible jsonb default '[]'::jsonb,
  status_extra jsonb default '[]'::jsonb,
  messages jsonb default '{}'::jsonb,
  updated_at bigint default 0
);

alter table commune_config enable row level security;

drop policy if exists "public access" on commune_config;
create policy "public read" on commune_config for select using (true);
create policy "public write" on commune_config for insert with check (true);
create policy "public update" on commune_config for update using (true) with check (true);

-- Nouveaux champs par agent (service assigné, notification par email) sur la table
-- accounts existante — sans effet sur les comptes citoyen/gérant (restent NULL).
alter table accounts add column if not exists service text;
alter table accounts add column if not exists notify_by_email boolean;
