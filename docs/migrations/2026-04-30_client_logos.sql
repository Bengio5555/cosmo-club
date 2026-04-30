-- Logos des clients à afficher dans le marquee "Ils nous ont fait
-- confiance" sur le site public. Le fichier image vit dans Vercel
-- Blob (privé), seule l'URL signée est stockée ici.

CREATE TABLE IF NOT EXISTS public.client_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_logos_position_idx
  ON public.client_logos (archived, position, created_at);

ALTER TABLE public.client_logos ENABLE ROW LEVEL SECURITY;

-- Authenticated dashboard users can read/write. Anonymous access is
-- not granted directly — the public marquee fetches via a server
-- component using the service role.
DROP POLICY IF EXISTS "client_logos_authenticated_all" ON public.client_logos;
CREATE POLICY "client_logos_authenticated_all"
  ON public.client_logos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.client_logos IS
  'Logos clients affichés dans le marquee homepage. Image dans Vercel Blob, URL référencée ici.';
