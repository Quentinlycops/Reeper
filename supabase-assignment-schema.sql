-- Reeper — attribution d'un Reep à un ou plusieurs agents + journal de bord
-- personnel par compte (colonnes assigned_to sur reeps, personal_journal sur
-- accounts).
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

alter table reeps add column if not exists assigned_to jsonb default '[]'::jsonb;
alter table accounts add column if not exists personal_journal jsonb default '[]'::jsonb;
