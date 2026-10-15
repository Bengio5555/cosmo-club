-- 2026-10-15 — Suivi de remise des e-mails de devis (webhook Resend)
--
-- Une ligne par e-mail de devis envoyé (sendDevis). L'id renvoyé par Resend
-- sert de clé de rattachement pour les événements du webhook
-- /api/webhooks/resend, qui remplit les horodatages ci-dessous (chaque
-- colonne n'est posée qu'une fois : le premier événement reçu fait foi).
-- resend_email_id est null quand Resend a refusé l'envoi (error = motif).
--
-- À appliquer dans le SQL Editor Supabase (le connecteur MCP est en lecture seule).

create table if not exists public.quote_emails (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  resend_email_id  text unique,
  recipient        text,
  error            text,                -- refus de Resend à l'envoi
  created_at       timestamptz not null default now(),  -- envoi demandé
  sent_at          timestamptz,         -- email.sent : accepté par Resend
  delivered_at     timestamptz,         -- email.delivered
  delayed_at       timestamptz,         -- email.delivery_delayed
  opened_at        timestamptz,         -- email.opened (indicatif)
  bounced_at       timestamptz,         -- email.bounced / email.suppressed
  complained_at    timestamptz,         -- email.complained (spam)
  failed_at        timestamptz,         -- email.failed
  problem_detail   text                 -- motif du rebond / de l'échec
);

create index if not exists quote_emails_quote_idx
  on public.quote_emails (quote_id, created_at desc);

alter table public.quote_emails enable row level security;

-- Même périmètre que quotes. Lecture + insertion depuis le dashboard
-- (sendDevis). Les mises à jour viennent uniquement du webhook, qui passe
-- par le service_role : aucune policy update/delete pour authenticated.
drop policy if exists quote_emails_select on public.quote_emails;
create policy quote_emails_select on public.quote_emails for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));

drop policy if exists quote_emails_insert on public.quote_emails;
create policy quote_emails_insert on public.quote_emails for insert to authenticated
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));
