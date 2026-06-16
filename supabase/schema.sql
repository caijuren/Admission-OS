create table if not exists public.app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_service_role_all" on public.app_state;

create policy "app_state_service_role_all"
on public.app_state
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
