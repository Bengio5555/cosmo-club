-- Calendar subscription token. The owner generates one in Settings;
-- the public ICS feed lives at /calendar/{token} and is gated solely
-- by knowledge of this opaque value. Regenerating rotates it and
-- invalidates the previous URL.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS calendar_token TEXT;

COMMENT ON COLUMN public.settings.calendar_token IS
  'Jeton secret pour le flux iCalendar public (/calendar/{token}). NULL = aucun lien généré, pas de partage.';
