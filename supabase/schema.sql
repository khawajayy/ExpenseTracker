-- ===========================================================================
--  Expense Tracker — Supabase schema
--  Run this ONCE in your Supabase project:
--    Dashboard  ->  SQL Editor  ->  New query  ->  paste  ->  Run
--  Row Level Security ensures every user only ever sees their own rows,
--  so it is safe to ship the anon key publicly on GitHub Pages.
-- ===========================================================================

-- ---------- Transactions ----------
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  txn_date    date not null,
  description text not null,
  amount      numeric(14,2) not null check (amount >= 0),
  category    text,
  direction   text not null check (direction in ('IN','OUT')),
  created_at  timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, txn_date);

-- ---------- Accounts (assets + bank balances) ----------
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  kind        text not null check (kind in ('asset','bank','debt')),
  balance     numeric(14,2) not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists accounts_user_idx
  on public.accounts (user_id);

-- ---------- Row Level Security ----------
alter table public.transactions enable row level security;
alter table public.accounts     enable row level security;

-- Each policy scopes every operation to the signed-in user's own rows.
drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own accounts" on public.accounts;
create policy "own accounts" on public.accounts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
