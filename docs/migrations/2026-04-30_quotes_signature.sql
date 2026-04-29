-- Audit trail for the quote-acceptance e-signature flow.
-- Stores the drawn signature (base64 PNG), signer identity, IP, and
-- the CGV version hash that was accepted. Required for legal value
-- under Art. 1366 du Code civil + eIDAS "simple signature" tier.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS signature_data TEXT,
  ADD COLUMN IF NOT EXISTS signed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS cgv_version TEXT,
  ADD COLUMN IF NOT EXISTS cgv_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.quotes.signature_data IS
  'Image PNG (data URL base64) du tracé de signature dessiné par le client.';
COMMENT ON COLUMN public.quotes.signed_by_name IS
  'Nom déclaré par le signataire dans la modale d''acceptation.';
COMMENT ON COLUMN public.quotes.signed_ip IS
  'Adresse IP du client au moment de la signature (preuve d''horodatage).';
COMMENT ON COLUMN public.quotes.cgv_version IS
  'Hash SHA-256 court de la version des CGV affichée au moment de l''acceptation.';
COMMENT ON COLUMN public.quotes.cgv_accepted_at IS
  'Horodatage UTC de la coche "Lu et accepté les CGV".';
