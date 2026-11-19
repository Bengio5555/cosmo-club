-- Conformité des indépendants (obligation de vigilance URSSAF)
-- Seuil légal : 5 000 € HT cumulés avec un même indépendant → attestation
-- de vigilance de moins de 6 mois. Politique Cosmo : demande dès 4 000 €
-- (projeté sur 12 mois), renouvellement tous les 3 mois au-delà.

-- 1. Champs sur la fiche équipe
alter table public.staff
  add column if not exists legal_status text check (legal_status in ('micro', 'societe', 'extra_salarie')),
  add column if not exists siret text,
  add column if not exists siret_status text check (siret_status in ('actif', 'cesse', 'introuvable')),
  add column if not exists siret_name text,
  add column if not exists siret_checked_at timestamptz,
  add column if not exists compliance_token uuid not null default gen_random_uuid(),
  add column if not exists compliance_requested_at timestamptz,
  add column if not exists compliance_reminded_at timestamptz;

create unique index if not exists staff_compliance_token_key on public.staff (compliance_token);

-- 2. Documents déposés (attestation de vigilance, assurance RC pro)
create table if not exists public.staff_documents (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  kind text not null check (kind in ('attestation_vigilance', 'rc_pro')),
  file_path text not null,
  file_name text,
  issued_at date,
  valid_until date,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  uploaded_via text not null default 'lien' check (uploaded_via in ('lien', 'dashboard')),
  created_at timestamptz not null default now()
);

create index if not exists staff_documents_staff_idx on public.staff_documents (staff_id, kind, issued_at desc);

alter table public.staff_documents enable row level security;

drop policy if exists staff_documents_rw on public.staff_documents;
create policy staff_documents_rw on public.staff_documents
  for all
  using (public.app_role() in ('owner', 'admin', 'compta'))
  with check (public.app_role() in ('owner', 'admin', 'compta'));

-- 3. Relances automatiques : désactivées par défaut, activables depuis
--    la page Conformité.
alter table public.settings
  add column if not exists compliance_auto_emails boolean not null default false;

-- 4. Espace de stockage privé (aucune politique publique : lecture et
--    écriture uniquement côté serveur, liens signés de courte durée).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-documents', 'staff-documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
