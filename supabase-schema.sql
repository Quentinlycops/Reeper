-- Reeper — schéma Supabase (base de données partagée)
-- À coller dans Supabase > SQL Editor > Run

create table if not exists accounts (
  key text primary key,
  type text not null,
  username text unique not null,
  password text not null,
  display_name text not null,
  first_name text,
  last_name text,
  email text,
  phone text default '',
  address text default '',
  initials text,
  av_bg text,
  role text,
  status text,
  commune text,
  points integer default 0,
  pending_commune text,
  is_primary boolean default false,
  redeemed jsonb default '[]'::jsonb,
  updated_at bigint default 0
);

create table if not exists reeps (
  id text primary key,
  title text,
  path jsonb,
  leaf text,
  cat text,
  service text,
  status text,
  commune text,
  place text,
  address text,
  lat double precision,
  lon double precision,
  description text,
  photo_url text,
  photos jsonb,
  close_photo_url text,
  close_note text,
  agents_in jsonb,
  reporter_account text,
  created_at bigint,
  closed_at bigint,
  deleted boolean default false,
  deleted_at bigint,
  timeline jsonb,
  points_awarded integer default 0,
  updated_at bigint default 0
);

create table if not exists messages (
  id text primary key,
  from_key text,
  to_key text,
  to_group text,
  text text,
  when_ts bigint,
  read boolean default false,
  reep text,
  transfer boolean default false,
  file text,
  files jsonb,
  contact text,
  read_by jsonb,
  updated_at bigint default 0
);

create table if not exists groups (
  id text primary key,
  name text,
  members jsonb,
  created_by text,
  created_when bigint,
  updated_at bigint default 0
);

-- Démo sans authentification serveur : accès ouvert (lecture/écriture) sur ces 4 tables.
alter table accounts enable row level security;
alter table reeps enable row level security;
alter table messages enable row level security;
alter table groups enable row level security;

drop policy if exists "public access" on accounts;
create policy "public access" on accounts for all using (true) with check (true);

drop policy if exists "public access" on reeps;
create policy "public access" on reeps for all using (true) with check (true);

drop policy if exists "public access" on messages;
create policy "public access" on messages for all using (true) with check (true);

drop policy if exists "public access" on groups;
create policy "public access" on groups for all using (true) with check (true);
