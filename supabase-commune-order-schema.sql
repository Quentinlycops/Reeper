-- Reeper — colonne "reep_order" sur la table communes_meta (numérotation des
-- Reeps par commune : chaque commune garde un numéro permanent, attribué
-- dans l'ordre de sa création).
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

alter table communes_meta add column if not exists reep_order integer;
