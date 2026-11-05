-- Motif de refus d'un devis, donné par le client sur la plaquette publique.
--
-- Quand un client clique « Refuser le devis », une fenêtre lui propose un
-- motif (facultatif) et un mot libre. Les deux sont enregistrés ici, repris
-- dans l'e-mail « Devis refusé » envoyé à Cosmo Club et affichés sur le
-- devis dans le dashboard.
--
-- Les politiques RLS existantes de quotes couvrent déjà ces colonnes ;
-- l'écriture se fait côté serveur avec la clé de service.

alter table public.quotes
  add column if not exists refusal_reason text,
  add column if not exists refusal_comment text;

alter table public.quotes
  drop constraint if exists quotes_refusal_reason_check;
alter table public.quotes
  add constraint quotes_refusal_reason_check
  check (refusal_reason is null or refusal_reason in ('budget', 'date', 'autre_prestataire', 'autre'));

alter table public.quotes
  drop constraint if exists quotes_refusal_comment_len;
alter table public.quotes
  add constraint quotes_refusal_comment_len
  check (refusal_comment is null or char_length(refusal_comment) <= 600);
