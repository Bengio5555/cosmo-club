-- Carte à choisir : l'opérateur propose au client une sélection de
-- cocktails d'une gamme (avec un maximum à cocher) ; le client choisit sur
-- une page à jeton ; la réponse remonte sur le devis et l'événement lié.
-- À appliquer dans le SQL Editor Supabase (le connecteur MCP est en lecture seule).

create table if not exists public.quote_menu_proposals (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  gamme         text not null,
  cocktail_ids  uuid[] not null,
  max_choices   integer not null check (max_choices > 0),
  access_token  uuid not null default gen_random_uuid(),
  message       text,
  status        text not null default 'sent' check (status in ('sent','answered')),
  chosen_ids    uuid[],
  answered_at   timestamptz,
  seen_at       timestamptz,            -- l'opérateur a pris connaissance de la réponse
  created_at    timestamptz not null default now()
);

create index if not exists quote_menu_proposals_quote_idx
  on public.quote_menu_proposals (quote_id, created_at desc);
create unique index if not exists quote_menu_proposals_token_idx
  on public.quote_menu_proposals (access_token);

alter table public.quote_menu_proposals enable row level security;

-- Même périmètre que quote_messages : la page publique /carte/[jeton]
-- passe par le service_role, aucun accès anon nécessaire.
drop policy if exists quote_menu_proposals_rw on public.quote_menu_proposals;
create policy quote_menu_proposals_rw on public.quote_menu_proposals for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager','compta']::user_role[]));
