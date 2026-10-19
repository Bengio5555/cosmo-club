-- 2026-10-19 — Matériel identifié par QR code (bar, caisses, kit tech…)
--
-- Chaque élément physique porte un QR code unique (une caisse = un QR).
-- Sur un événement on coche les éléments à emporter ; le manutentionnaire
-- scanne chaque élément au stock avant de charger (phase « depart ») et
-- sur l'événement avant de remettre dans le camion (phase « retour »).
-- Un scan d'un élément qui n'est pas prévu sur l'événement est refusé
-- (écran rouge) mais journalisé dans equipment_scans.
--
-- Le module de scan est public, protégé par le token du briefing de
-- l'événement (events.briefing_token) : il écrit via le service_role,
-- comme la page /briefing. Aucune policy d'écriture n'est donc ouverte
-- aux manutentionnaires (pas de compte).
--
-- À appliquer dans le SQL Editor Supabase (le connecteur MCP est en lecture seule).

do $$ begin
  create type public.equipment_category as enum ('bar','caisse','tech','verrerie','autre');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_phase as enum ('depart','retour');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_scan_result as enum ('ok','deja','autre_evenement','inconnu');
exception when duplicate_object then null; end $$;

-- ---------- Les éléments ----------
create table if not exists public.equipment (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (char_length(code) between 2 and 24),  -- ex. BAR-01, CAISSE-07
  name        text not null check (char_length(name) between 2 and 80),
  category    public.equipment_category not null default 'autre',
  contents    text,                      -- ce qu'il y a dedans (texte libre)
  qr_token    text not null unique default replace(gen_random_uuid()::text, '-', ''),
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists equipment_active_idx
  on public.equipment (category, code) where archived = false;

drop trigger if exists equipment_updated_at on public.equipment;
create trigger equipment_updated_at
  before update on public.equipment
  for each row execute function public._touch_updated_at();

-- ---------- Sélection par événement + état des scans ----------
create table if not exists public.event_equipment (
  event_id      uuid not null references public.events(id) on delete cascade,
  equipment_id  uuid not null references public.equipment(id) on delete cascade,
  depart_at     timestamptz,   -- scanné au stock, avant chargement
  depart_by     text,          -- prénom saisi par le manutentionnaire
  retour_at     timestamptz,   -- scanné sur l'événement, avant le camion
  retour_by     text,
  created_at    timestamptz not null default now(),
  primary key (event_id, equipment_id)
);

create index if not exists event_equipment_equipment_idx
  on public.event_equipment (equipment_id);

-- ---------- Journal brut de tous les scans ----------
create table if not exists public.equipment_scans (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  equipment_id  uuid references public.equipment(id) on delete set null,
  phase         public.equipment_phase not null,
  result        public.equipment_scan_result not null,
  scanned_by    text,
  raw           text,           -- contenu lu quand le QR est inconnu
  created_at    timestamptz not null default now()
);

create index if not exists equipment_scans_event_idx
  on public.equipment_scans (event_id, created_at desc);

-- ---------- RLS ----------
alter table public.equipment enable row level security;
alter table public.event_equipment enable row level security;
alter table public.equipment_scans enable row level security;

-- Lecture pour toute l'équipe (le staff voit la fiche événement).
drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

drop policy if exists event_equipment_select on public.event_equipment;
create policy event_equipment_select on public.event_equipment for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));

drop policy if exists event_equipment_write on public.event_equipment;
create policy event_equipment_write on public.event_equipment for all to authenticated
  using      (public.app_role() = any (array['owner','admin','manager']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','manager']::user_role[]));

-- Les scans ne s'écrivent que via le service_role (module public).
drop policy if exists equipment_scans_select on public.equipment_scans;
create policy equipment_scans_select on public.equipment_scans for select to authenticated
  using (public.app_role() = any (array['owner','admin','manager','staff']::user_role[]));
