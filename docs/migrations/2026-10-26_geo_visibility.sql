-- Visibilité IA (page /dashboard/visibilite).
--
-- 1. geo_runs / geo_results : chaque lundi, une liste fixe de questions
--    clients est posée à un assistant avec recherche web ; on enregistre
--    si cosmoclub.fr est cité et quels sites le sont à notre place.
-- 2. ai_bot_hits : passages des robots IA (GPTBot, PerplexityBot…) sur les
--    pages publiques, relevés par proxy.ts. Aucune IP, juste robot + chemin.
--
-- Écriture uniquement via la clé de service (cron, proxy) : pas de
-- politique d'insertion pour authenticated. Lecture owner/admin/manager.

create table if not exists public.geo_runs (
  id         uuid primary key default gen_random_uuid(),
  ran_at     timestamptz not null default now(),
  model      text not null,
  questions  integer not null,
  cited      integer not null,
  cost_usd   double precision not null default 0,
  error      text
);

create index if not exists geo_runs_ran_at_idx on public.geo_runs (ran_at desc);

create table if not exists public.geo_results (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.geo_runs(id) on delete cascade,
  question        text not null,
  category        text not null,
  cited           boolean not null,
  cited_domains   text[] not null default '{}',
  answer_excerpt  text,
  error           text
);

create index if not exists geo_results_run_idx on public.geo_results (run_id);

create table if not exists public.ai_bot_hits (
  id      bigint generated always as identity primary key,
  bot     text not null,
  path    text not null,
  hit_at  timestamptz not null default now()
);

create index if not exists ai_bot_hits_hit_at_idx on public.ai_bot_hits (hit_at desc);

-- ---------- RLS ----------
alter table public.geo_runs enable row level security;
alter table public.geo_results enable row level security;
alter table public.ai_bot_hits enable row level security;

drop policy if exists geo_runs_select on public.geo_runs;
create policy geo_runs_select on public.geo_runs for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists geo_results_select on public.geo_results;
create policy geo_results_select on public.geo_results for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists ai_bot_hits_select on public.ai_bot_hits;
create policy ai_bot_hits_select on public.ai_bot_hits for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager']::user_role[]));

revoke all on public.geo_runs, public.geo_results, public.ai_bot_hits from anon;

-- ---------- Rattrapage attribution ----------
-- ChatGPT tague ses liens avec utm_source=chatgpt.com : ces demandes
-- étaient classées « Autre site » (referral) avant le correctif de
-- lib/attribution.ts. On les reclasse en « Assistant IA ».
update public.leads
   set channel = 'ai_assistant'
 where channel = 'referral'
   and lower(coalesce(utm_source, '')) ~ '^(chatgpt(\.com)?|openai|perplexity(\.ai)?|claude(\.ai)?|gemini|copilot|mistral|you\.com)$';
