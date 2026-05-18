-- Per-devis moodboard: array of image URLs (public URLs from the
-- cosmoclub-images Storage bucket) selected by the owner from the
-- event photo gallery. Empty array = fall back to default moodboard
-- in app/devis/[number]/page.tsx.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS moodboard_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.quotes.moodboard_images IS
  'Tableau JSON d''URLs d''images (max 8) sélectionnées pour le moodboard de la plaquette. Vide = défaut.';
