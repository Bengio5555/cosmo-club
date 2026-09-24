-- Provenance des demandes : d'où vient chaque lead.
-- `channel` est la valeur lisible et filtrable (google_organic, instagram_paid,
-- mariages_net, telephone, recommandation…), dérivée automatiquement des UTM
-- et du site référent pour le formulaire du site, choisie à la main pour les
-- demandes saisies dans le dashboard. Les colonnes utm_* / referrer /
-- landing_page gardent la donnée brute pour recouper avec Meta Ads / GA4.
-- À appliquer dans le SQL Editor Supabase (le connecteur MCP est en lecture seule),
-- AVANT le déploiement du code qui lit ces colonnes.

alter table public.leads
  add column if not exists channel       text,
  add column if not exists utm_source    text,
  add column if not exists utm_medium    text,
  add column if not exists utm_campaign  text,
  add column if not exists utm_content   text,
  add column if not exists referrer      text,
  add column if not exists landing_page  text;

create index if not exists leads_channel_idx on public.leads (channel);

comment on column public.leads.channel is
  'Canal d''origine (voir lib/attribution.ts CHANNELS). Null = non renseigné.';

-- Les politiques RLS existantes sur leads (lecture/écriture par rôle, insert
-- site via service_role) couvrent ces colonnes : rien à changer.
