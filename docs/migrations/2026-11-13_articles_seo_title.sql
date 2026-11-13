-- Titre SEO court pour les articles de blog (balise <title>).
-- Le titre éditorial reste le H1 ; Google tronque au-delà de ~60 caractères.
alter table public.articles
  add column if not exists seo_title text
  check (seo_title is null or char_length(seo_title) <= 70);
