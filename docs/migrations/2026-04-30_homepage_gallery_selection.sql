-- Sélection manuelle des photos affichées dans la galerie
-- "Des nuits inoubliables" sur la home. La présence d'une ligne avec
-- un image_key signifie que l'image est affichée sur la home, dans
-- l'ordre de `position`. Pas de ligne = pas affichée.

CREATE TABLE IF NOT EXISTS public.homepage_gallery_selection (
  image_key TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homepage_gallery_position_idx
  ON public.homepage_gallery_selection (position);

ALTER TABLE public.homepage_gallery_selection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_gallery_authenticated_all"
  ON public.homepage_gallery_selection;
CREATE POLICY "homepage_gallery_authenticated_all"
  ON public.homepage_gallery_selection
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.homepage_gallery_selection IS
  'Sélection ordonnée des photos affichées dans la galerie de la home. image_key correspond aux clés de images-config.json (page evenements).';
