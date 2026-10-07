-- Runway OS: cloud sync schema for Supabase.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to run again (every statement is idempotent).
--
-- One table holds every record the app stores (habits, days, workouts, transactions, photos…).
-- The app keeps working offline on the phone and copies changes here when online.
-- Row Level Security: each signed-in user can only read and write their own rows.

create table if not exists public.records (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  col        text    not null,                 -- collection name, e.g. 'days', 'transactions'
  id         text    not null,                 -- record id inside the collection
  rec        jsonb   not null,                 -- the record itself
  updated_at bigint  not null,                 -- ms since epoch, set by the app; newest wins
  deleted    boolean not null default false,   -- tombstone, so deletes reach every device
  primary key (user_id, col, id)
);

-- Fast "what changed since my last sync?" reads.
create index if not exists records_user_updated_idx on public.records (user_id, updated_at);

-- Last writer wins: an older copy never overwrites a newer one (e.g. a phone that was offline for a week).
create or replace function public.records_keep_newest()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists records_keep_newest on public.records;
create trigger records_keep_newest
  before update on public.records
  for each row execute function public.records_keep_newest();

-- Row Level Security: only the owner sees and changes their rows.
alter table public.records enable row level security;

drop policy if exists "read own records" on public.records;
create policy "read own records" on public.records
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "insert own records" on public.records;
create policy "insert own records" on public.records
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "update own records" on public.records;
create policy "update own records" on public.records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "delete own records" on public.records;
create policy "delete own records" on public.records
  for delete to authenticated using (user_id = (select auth.uid()));

-- Signed-out visitors get nothing.
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;
