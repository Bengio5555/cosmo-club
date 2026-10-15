-- 2026-10-15 — Dossier Google Drive rattaché à un événement
--
-- Id du dossier du Drive partagé « Cosmo Club » (Évènements/AAAA-MM-JJ – Titre)
-- créé ou rattaché depuis la fiche événement du dashboard. Null = pas de dossier.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS drive_folder_id text;

COMMENT ON COLUMN public.events.drive_folder_id IS
  'Google Drive folder id (shared drive Cosmo Club) holding this event''s documents and photos.';
