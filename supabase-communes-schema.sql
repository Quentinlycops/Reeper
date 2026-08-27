-- Reeper — table "communes_meta" (liste des communes/entités servies + leur code d'inscription)
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

create table if not exists communes_meta (
  name text primary key,
  code text unique,
  center jsonb,
  zip jsonb default '[]'::jsonb,
  updated_at bigint default 0
);

alter table communes_meta enable row level security;

drop policy if exists "public access" on communes_meta;
create policy "public read" on communes_meta for select using (true);
create policy "public write" on communes_meta for insert with check (true);
create policy "public update" on communes_meta for update using (true) with check (true);
