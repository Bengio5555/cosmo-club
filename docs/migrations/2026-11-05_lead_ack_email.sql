-- Suivi de l'accusé de réception envoyé au prospect après le formulaire
-- de devis (e-mail « Votre demande Cosmo Club · notre Book »).
--
-- /api/devis note l'id Resend de l'e-mail sur la demande ; le webhook
-- /api/webhooks/resend remplit ensuite les horodatages (chaque colonne
-- n'est posée qu'une fois). La liste des demandes en tire un picto :
-- remis, parti, non remis.
--
-- Les politiques RLS existantes de leads couvrent ces colonnes ; les
-- écritures passent par la clé de service.

alter table public.leads
  add column if not exists ack_email_id     text,         -- id Resend de l'accusé
  add column if not exists ack_sent_at      timestamptz,  -- accepté par Resend
  add column if not exists ack_delivered_at timestamptz,  -- arrivé chez le prospect
  add column if not exists ack_opened_at    timestamptz,  -- ouvert (indicatif)
  add column if not exists ack_problem_at   timestamptz,  -- rebond, échec ou spam
  add column if not exists ack_problem      text;         -- motif du problème

create unique index if not exists leads_ack_email_id_key
  on public.leads (ack_email_id)
  where ack_email_id is not null;
