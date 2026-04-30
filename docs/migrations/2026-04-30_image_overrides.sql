-- Persist per-image admin metadata (title, label, orientation) in
-- the database rather than mutating `public/images-config.json` at
-- runtime. Vercel's serverless filesystem is read-only outside the
-- build, so the previous JSON-write path silently failed in prod.
--
-- The path/url itself stays driven by static config + Vercel Blob —
-- only the editorial metadata is overlaid from this table.

CREATE TABLE IF NOT EXISTS public.image_overrides (
  page TEXT NOT NULL,
  image_key TEXT NOT NULL,
  title TEXT,
  label TEXT,
  orientation TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page, image_key)
);

ALTER TABLE public.image_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "image_overrides_authenticated_all"
  ON public.image_overrides;
CREATE POLICY "image_overrides_authenticated_all"
  ON public.image_overrides
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.image_overrides IS
  'Surcharges éditoriales (titre, tag, orientation) appliquées par-dessus images-config.json. Chemin physique non géré ici.';
