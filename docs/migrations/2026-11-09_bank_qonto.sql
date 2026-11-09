-- Banque (Qonto) : miroir local des comptes et des mouvements, rapprochement
-- avec les encaissements de factures. Lecture seule côté Qonto : le site ne
-- fait jamais de virement, il lit l'API Business avec la clé API et écrit
-- uniquement dans ces deux tables + invoice_payments.

create table if not exists public.bank_accounts (
  id                 text primary key,                 -- id Qonto du compte
  name               text,
  iban_last4         text,
  currency           text not null default 'EUR',
  balance            numeric(12,2),
  authorized_balance numeric(12,2),
  is_main            boolean not null default false,
  status             text,
  synced_at          timestamptz,
  last_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.bank_transactions (
  id                 uuid primary key default gen_random_uuid(),
  qonto_id           text not null unique,             -- transaction_id Qonto
  bank_account_id    text not null references public.bank_accounts(id) on delete cascade,
  side               text not null check (side in ('credit','debit')),
  amount             numeric(12,2) not null,           -- toujours positif
  currency           text not null default 'EUR',
  operation_type     text,
  label              text,                             -- contrepartie
  reference          text,                             -- motif du virement
  note               text,
  status             text not null,                    -- pending / completed / declined / reversed
  emitted_at         timestamptz,
  settled_at         timestamptz,
  has_attachment     boolean not null default false,
  invoice_payment_id uuid references public.invoice_payments(id) on delete set null,
  match_status       text not null default 'a_traiter'
                     check (match_status in ('a_traiter','rapproche','ignore')),
  match_mode         text check (match_mode in ('auto','manuel')),
  matched_at         timestamptz,
  matched_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists bank_transactions_settled_idx on public.bank_transactions (settled_at desc);
create index if not exists bank_transactions_match_idx   on public.bank_transactions (side, match_status) where match_status = 'a_traiter';
create index if not exists bank_transactions_payment_idx on public.bank_transactions (invoice_payment_id) where invoice_payment_id is not null;

-- updated_at automatique (même fonction que les autres tables si elle existe)
create or replace function public.bank_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists bank_accounts_touch on public.bank_accounts;
create trigger bank_accounts_touch before update on public.bank_accounts
  for each row execute function public.bank_touch_updated_at();
drop trigger if exists bank_transactions_touch on public.bank_transactions;
create trigger bank_transactions_touch before update on public.bank_transactions
  for each row execute function public.bank_touch_updated_at();

-- RLS : mêmes rôles que les factures (owner, admin, compta). Le staff et
-- les managers ne voient rien. La synchro passe par la clé de service.
alter table public.bank_accounts     enable row level security;
alter table public.bank_transactions enable row level security;

drop policy if exists bank_accounts_rw on public.bank_accounts;
create policy bank_accounts_rw on public.bank_accounts for all to authenticated
  using      (public.app_role() = any (array['owner','admin','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','compta']::user_role[]));

drop policy if exists bank_transactions_rw on public.bank_transactions;
create policy bank_transactions_rw on public.bank_transactions for all to authenticated
  using      (public.app_role() = any (array['owner','admin','compta']::user_role[]))
  with check (public.app_role() = any (array['owner','admin','compta']::user_role[]));
