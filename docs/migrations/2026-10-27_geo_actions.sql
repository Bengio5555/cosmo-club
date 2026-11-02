-- Bloc « À faire cette semaine » de /dashboard/visibilite.
--
-- 1. geo_results.cited_sources : adresse et titre des pages citées à notre
--    place ({url, title}), pour savoir à quel article écrire.
-- 2. geo_actions : décisions prises sur les actions proposées (faite, plus
--    tard). Les actions elles-mêmes sont calculées à chaque affichage par
--    des règles fixes (lib/geo/actions.ts) ; on ne stocke que les décisions
--    et, pour une action faite, la base de comparaison de la mesure à J+28.

alter table public.geo_results
  add column if not exists cited_sources jsonb not null default '[]'::jsonb;

create table if not exists public.geo_actions (
  key            text primary key,
  kind           text not null,
  title          text not null,
  status         text not null check (status in ('done', 'snoozed')),
  snoozed_until  date,
  done_at        timestamptz,
  baseline       jsonb,
  updated_by     uuid references public.profiles(id) on delete set null,
  updated_at     timestamptz not null default now()
);

alter table public.geo_actions enable row level security;

drop policy if exists geo_actions_rw on public.geo_actions;
create policy geo_actions_rw on public.geo_actions for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

revoke all on public.geo_actions from anon;
