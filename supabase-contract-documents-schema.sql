-- Reeper — colonne "documents" sur la table contracts (refonte Documents & Facturation,
-- plusieurs documents de nature différente : contrat, devis, avenant, courrier...).
-- À coller dans Supabase > SQL Editor > Run, après les scripts déjà exécutés.

alter table contracts add column if not exists documents jsonb default '[]'::jsonb;
