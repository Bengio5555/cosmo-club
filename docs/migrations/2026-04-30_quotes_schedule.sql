-- Run-of-show / planning d'événement intégré au devis. Stocké comme
-- un tableau JSON [{time:"14:00", label:"Livraison"}…] pour rester
-- flexible sans table dédiée — il s'agit d'un texte simple côté UX.
--
-- Affiché côté plaquette à la place de la photo "offre signature"
-- quand la liste n'est pas vide.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.quotes.schedule IS
  'Planning de l''événement : tableau JSON [{time:"HH:MM", label:"…"}]. Affiché dans la plaquette client.';
