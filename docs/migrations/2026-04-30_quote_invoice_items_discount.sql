-- Per-line discount in € HT, visible to the client on the devis/facture.
-- The generated `line_total_ht` is rebuilt to subtract the discount, so
-- every existing aggregator (totals on the quote/invoice, the public
-- plaquette, the PDF) reflects the new figure with no application
-- code change.
--
-- GREATEST(..., 0) keeps the line non-negative even if the owner
-- enters a discount larger than qty × price.

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS discount_ht NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_ht NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Drop and recreate the generated column with the new formula.
ALTER TABLE public.quote_items DROP COLUMN IF EXISTS line_total_ht;
ALTER TABLE public.quote_items
  ADD COLUMN line_total_ht NUMERIC
  GENERATED ALWAYS AS (
    round(GREATEST((qty * unit_price_ht) - discount_ht, 0), 2)
  ) STORED;

ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS line_total_ht;
ALTER TABLE public.invoice_items
  ADD COLUMN line_total_ht NUMERIC
  GENERATED ALWAYS AS (
    round(GREATEST((qty * unit_price_ht) - discount_ht, 0), 2)
  ) STORED;

COMMENT ON COLUMN public.quote_items.discount_ht IS
  'Remise HT en euros appliquée sur la ligne. Soustraite du sous-total avant arrondi.';
COMMENT ON COLUMN public.invoice_items.discount_ht IS
  'Remise HT en euros appliquée sur la ligne. Soustraite du sous-total avant arrondi.';
