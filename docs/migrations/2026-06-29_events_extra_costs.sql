-- 2026-06-29 — Per-event additional charges (margin)
--
-- Adds a JSONB column holding glassware rental, ice and free-form
-- supplements that are subtracted from the event's net margin. Shape:
--   { "verrerie": number, "glacons": number,
--     "supplements": [ { "description": string, "amount": number } ] }
--
-- The app reads it from select("*") so it tolerates the column being
-- absent (parsed as empty); only saving extra costs requires it. Apply
-- before relying on the "Charges additionnelles" editor.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS extra_costs JSONB;

COMMENT ON COLUMN public.events.extra_costs IS
  'Charges additionnelles déduites de la marge : { verrerie, glacons, supplements[] }.';
