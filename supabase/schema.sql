create table if not exists public.app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null default 'default',
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_state add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.app_state add column if not exists version integer not null default 1;
alter table public.app_state add column if not exists updated_at timestamptz not null default now();

-- Existing 1.0 rows must be assigned to a Supabase auth user before the
-- NOT NULL constraint below can be applied:
-- update public.app_state set user_id = 'YOUR_SUPABASE_USER_ID' where user_id is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'app_state_pkey'
      and conrelid = 'public.app_state'::regclass
  ) then
    alter table public.app_state drop constraint app_state_pkey;
  end if;
end;
$$;

alter table public.app_state alter column user_id set not null;
alter table public.app_state alter column key set not null;
alter table public.app_state add primary key (user_id, key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.version = coalesce(old.version, 0) + 1;
  return new;
end;
$$;

drop trigger if exists app_state_set_updated_at on public.app_state;
create trigger app_state_set_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "app_state_service_role_all" on public.app_state;
drop policy if exists "app_state_user_select_own" on public.app_state;
drop policy if exists "app_state_user_insert_own" on public.app_state;
drop policy if exists "app_state_user_update_own" on public.app_state;
drop policy if exists "app_state_user_delete_own" on public.app_state;

create policy "app_state_service_role_all"
on public.app_state
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "app_state_user_select_own"
on public.app_state
for select
using (auth.uid() = user_id);

create policy "app_state_user_insert_own"
on public.app_state
for insert
with check (auth.uid() = user_id);

create policy "app_state_user_update_own"
on public.app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "app_state_user_delete_own"
on public.app_state
for delete
using (auth.uid() = user_id);
