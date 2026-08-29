-- Reeper — autorise la suppression via la clé publique pour les 3 tables liées
-- à une commune (communes_meta, contracts, commune_config), afin que "Supprimer
-- la commune" (espace Gérant > Contrats > commune) fonctionne réellement.
-- Ces tables sont des données de configuration gérées uniquement par le Gérant
-- depuis l'application (contrairement à reeps/accounts/messages, qui restent
-- durcies contre la suppression — voir supabase-hardening.sql).
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

drop policy if exists "public read" on communes_meta;
drop policy if exists "public write" on communes_meta;
drop policy if exists "public update" on communes_meta;
create policy "public access" on communes_meta for all using (true) with check (true);

drop policy if exists "public read" on contracts;
drop policy if exists "public write" on contracts;
drop policy if exists "public update" on contracts;
create policy "public access" on contracts for all using (true) with check (true);

drop policy if exists "public read" on commune_config;
drop policy if exists "public write" on commune_config;
drop policy if exists "public update" on commune_config;
create policy "public access" on commune_config for all using (true) with check (true);
