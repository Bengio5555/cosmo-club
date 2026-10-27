-- Demandes d'avis Google après un événement (page /dashboard/avis).
--
-- L'envoi reste manuel : un bouton par événement passé. On garde la date
-- et l'auteur du dernier envoi pour afficher l'état et éviter les doublons.
-- Les politiques events_rw et settings_rw (2026-06-16) couvrent déjà ces
-- colonnes : rien à ajouter côté RLS.

alter table public.events
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_requested_by uuid
    references public.profiles(id) on delete set null;

-- Lien « laisser un avis » de la fiche Google, réglé dans Paramètres.
alter table public.settings
  add column if not exists google_review_url text;
