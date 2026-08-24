-- Reeper — durcissement Supabase (à coller dans SQL Editor > Run, après le premier script)
-- Retire le droit de SUPPRESSION via la clé publique. L'application n'a jamais
-- besoin de DELETE (les suppressions se font via un champ "deleted" sur les Reeps,
-- jamais par une vraie suppression de ligne) — donc ce changement ne casse rien
-- côté application, mais empêche quelqu'un ayant la clé anon de vider les tables.

drop policy if exists "public access" on accounts;
create policy "public read" on accounts for select using (true);
create policy "public write" on accounts for insert with check (true);
create policy "public update" on accounts for update using (true) with check (true);

drop policy if exists "public access" on reeps;
create policy "public read" on reeps for select using (true);
create policy "public write" on reeps for insert with check (true);
create policy "public update" on reeps for update using (true) with check (true);

drop policy if exists "public access" on messages;
create policy "public read" on messages for select using (true);
create policy "public write" on messages for insert with check (true);
create policy "public update" on messages for update using (true) with check (true);

drop policy if exists "public access" on groups;
create policy "public read" on groups for select using (true);
create policy "public write" on groups for insert with check (true);
create policy "public update" on groups for update using (true) with check (true);
