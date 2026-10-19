-- Essais de personnalisation sur la page canettes : le texte que le
-- visiteur pose sur la canette (marque, sous-titre), la recette et l'encre
-- choisies, rattachés à un identifiant de session anonyme. Pas d'adresse
-- IP, pas de contact. Finalité : comprendre l'usage de la page et repérer
-- les marques qui s'y projettent. Conservation : 12 mois (voir la
-- politique de confidentialité).
-- À appliquer dans le SQL Editor Supabase (le connecteur MCP est en lecture seule).

create table if not exists public.can_sticker_tries (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null check (char_length(brand) between 2 and 24),
  subtitle    text check (char_length(subtitle) <= 24),
  recipe      text not null,
  ink         text not null check (ink in ('blanc','noir')),
  session_id  text not null check (char_length(session_id) <= 64),
  page        text,
  created_at  timestamptz not null default now()
);

-- Une ligne par marque et par session : retaper la même marque ne crée
-- pas de doublon, changer de recette ou d'encre non plus.
create unique index if not exists can_sticker_tries_session_brand_idx
  on public.can_sticker_tries (session_id, lower(brand));
create index if not exists can_sticker_tries_created_idx
  on public.can_sticker_tries (created_at desc);

alter table public.can_sticker_tries enable row level security;

-- Écriture uniquement via le service_role (action serveur de la page
-- publique). Lecture dans le dashboard pour l'équipe commerciale.
drop policy if exists can_sticker_tries_read on public.can_sticker_tries;
create policy can_sticker_tries_read on public.can_sticker_tries for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager']::user_role[]));

-- Purge des essais de plus de 12 mois (à brancher sur pg_cron si souhaité) :
--   delete from public.can_sticker_tries where created_at < now() - interval '12 months';
