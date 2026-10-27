-- Suivi des demandes d'avis Google (page /dashboard/avis).
--
-- 1. Une seule relance, 7 jours après la demande : date et auteur.
-- 2. « Avis reçu », coché à la main (Google ne dit pas qui a laissé quel
--    avis) : sort l'événement et le client des relances et des demandes.
-- 3. Lien de suivi : l'e-mail pointe vers cosmoclub.fr/avis/<jeton>, qui
--    note le premier clic puis redirige vers la fiche Google. Le jeton est
--    aléatoire (32 caractères hexadécimaux), il ne révèle rien.
--
-- La politique events_rw (2026-06-16) couvre déjà ces colonnes.

alter table public.events
  add column if not exists review_reminded_at timestamptz,
  add column if not exists review_reminded_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists review_received_at timestamptz,
  add column if not exists review_received_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists review_clicked_at timestamptz,
  add column if not exists review_token text
    not null default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists events_review_token_key
  on public.events (review_token);
