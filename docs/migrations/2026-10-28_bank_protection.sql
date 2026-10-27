-- Protection de l'IBAN affiché sur les factures.
--
-- Risque couvert : quelqu'un qui obtient un accès au dashboard (ou appelle
-- l'API Supabase avec une session volée) remplace l'IBAN, et les clients
-- paient sur son compte.
--
-- 1. IBAN et BIC ne s'écrivent plus depuis une session utilisateur : seul
--    le serveur (clé de service) peut les changer, après vérification du
--    rôle owner et d'un code reçu par e-mail (Paramètres → Banque).
-- 2. Une facture ne peut pas être figée avec un autre IBAN que celui des
--    Paramètres.
-- 3. Chaque changement est journalisé (IBAN masqué, qui, quand), y compris
--    s'il est fait hors du dashboard (éditeur SQL).
-- 4. Un compte ne peut pas devenir owner tout seul : le rôle d'un profil
--    ne change que par le serveur, et un compte non invité ne peut plus
--    être créé une fois le propriétaire en place.
--
-- auth.role() vaut 'authenticated' ou 'anon' pour une session navigateur,
-- 'service_role' pour le serveur, null dans l'éditeur SQL.

-- ── 1. Paramètres : IBAN / BIC ───────────────────────────────────────────

alter table public.settings
  add column if not exists bank_updated_at timestamptz,
  add column if not exists bank_updated_by uuid
    references public.profiles(id) on delete set null;

create or replace function public.mask_iban(v text) returns text
language sql immutable as $$
  select case
    when v is null or length(v) < 8 then v
    else left(v, 4) || ' •••• ' || right(v, 4)
  end
$$;

create table if not exists public.bank_change_log (
  id               bigint generated always as identity primary key,
  changed_at       timestamptz not null default now(),
  changed_by       uuid references public.profiles(id) on delete set null,
  via_dashboard    boolean not null,
  old_iban_masked  text,
  new_iban_masked  text,
  old_bic          text,
  new_bic          text
);

alter table public.bank_change_log enable row level security;
drop policy if exists bank_change_log_owner_read on public.bank_change_log;
create policy bank_change_log_owner_read on public.bank_change_log for select to authenticated
  using (public.app_role() = 'owner'::user_role);
revoke insert, update, delete on public.bank_change_log from anon, authenticated;

create or replace function public.guard_settings_bank() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_session boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
  dashboard boolean;
begin
  if tg_op = 'DELETE' then
    if is_session then
      raise exception 'Les paramètres ne peuvent pas être supprimés.' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if is_session and (new.iban is not null or new.bic is not null) then
      raise exception 'IBAN : modification réservée au propriétaire, avec code de confirmation.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.iban is distinct from old.iban or new.bic is distinct from old.bic then
    if is_session then
      raise exception 'IBAN : modification réservée au propriétaire, avec code de confirmation.' using errcode = '42501';
    end if;
    -- Le dashboard renseigne bank_updated_at dans la même requête ;
    -- sinon (éditeur SQL), l'auteur est inconnu.
    dashboard := new.bank_updated_at is distinct from old.bank_updated_at;
    if not dashboard then
      new.bank_updated_at := now();
      new.bank_updated_by := null;
    end if;
    insert into public.bank_change_log
      (changed_by, via_dashboard, old_iban_masked, new_iban_masked, old_bic, new_bic)
    values
      (new.bank_updated_by, dashboard, public.mask_iban(old.iban), public.mask_iban(new.iban), old.bic, new.bic);
  elsif is_session and (new.bank_updated_at is distinct from old.bank_updated_at
                        or new.bank_updated_by is distinct from old.bank_updated_by) then
    new.bank_updated_at := old.bank_updated_at;
    new.bank_updated_by := old.bank_updated_by;
  end if;
  return new;
end
$$;

drop trigger if exists settings_bank_guard on public.settings;
create trigger settings_bank_guard
  before insert or update or delete on public.settings
  for each row execute function public.guard_settings_bank();

-- Codes de confirmation : lus et écrits par le serveur uniquement.
create table if not exists public.bank_change_requests (
  id           uuid primary key,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  new_iban     text not null,
  new_bic      text,
  code_hash    text not null,
  attempts     int not null default 0,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.bank_change_requests enable row level security;
revoke all on public.bank_change_requests from anon, authenticated;

-- ── 2. Factures : l'IBAN figé doit être celui des Paramètres ─────────────

create or replace function public.guard_invoice_bank() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s record;
  new_iban text := new.legal_snapshot ->> 'iban';
  new_bic  text := new.legal_snapshot ->> 'bic';
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new_iban is not distinct from (old.legal_snapshot ->> 'iban')
     and new_bic is not distinct from (old.legal_snapshot ->> 'bic') then
    return new;
  end if;
  select iban, bic into s from public.settings where id = 1;
  if (new_iban is not null and new_iban is distinct from s.iban)
     or (new_bic is not null and new_bic is distinct from s.bic) then
    raise exception 'Facture : l''IBAN doit être celui des Paramètres.' using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists invoices_bank_guard on public.invoices;
create trigger invoices_bank_guard
  before insert or update on public.invoices
  for each row execute function public.guard_invoice_bank();

-- ── 3. Rôles : personne ne devient owner tout seul ───────────────────────

create or replace function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       and coalesce(auth.role(), '') in ('authenticated', 'anon') then
      raise exception 'Le rôle ne se change que depuis la page Équipe.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- INSERT (création du compte) : une fois le propriétaire en place, seuls
  -- les comptes invités depuis la page Équipe sont acceptés, jamais owner.
  if exists (select 1 from public.profiles where role = 'owner') then
    if new.role = 'owner' then
      raise exception 'Il ne peut y avoir qu''un propriétaire.' using errcode = '42501';
    end if;
    if not exists (select 1 from auth.users u where u.id = new.id and u.invited_at is not null) then
      raise exception 'Compte refusé : passez par une invitation depuis la page Équipe.' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

revoke execute on function public.guard_settings_bank() from anon, authenticated, public;
revoke execute on function public.guard_invoice_bank() from anon, authenticated, public;
revoke execute on function public.guard_profile_role() from anon, authenticated, public;
