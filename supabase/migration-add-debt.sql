-- ===========================================================================
--  MIGRATION: allow 'debt' liabilities in the accounts table
--  Run this ONCE in Supabase (SQL Editor -> New query -> paste -> Run) if you
--  set up the database BEFORE the Debts / Liabilities feature was added.
--  Safe to run more than once.
-- ===========================================================================

alter table public.accounts drop constraint if exists accounts_kind_check;
alter table public.accounts
  add constraint accounts_kind_check check (kind in ('asset','bank','debt'));
