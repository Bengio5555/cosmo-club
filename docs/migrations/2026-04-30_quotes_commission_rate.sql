-- Add commission_rate to quotes for the agency-referrer pricing toggle.
-- Default 0 = no commission. The application clamps the editor to 0..99
-- because the gross-up factor 1/(1-x/100) collapses at 100.
--
-- Apply via Supabase Dashboard → SQL Editor, or via the Supabase MCP.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.quotes.commission_rate IS
  'Pourcentage de commission reversée à un apporteur d''affaires. La majoration appliquée sur le total HT vaut 1/(1 - rate/100) pour préserver la marge.';
