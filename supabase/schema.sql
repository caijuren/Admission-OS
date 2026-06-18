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

-- ---------------------------------------------------------------------------
-- EduOS v1.5 structured data foundation
-- ---------------------------------------------------------------------------
-- Runtime still reads/writes public.app_state in v1.5. These tables prepare a
-- future dual-write/backfill migration without breaking the current JSON store.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  name text not null,
  school text,
  grade text,
  target_school text,
  current_stage text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  quote text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create table if not exists public.goals (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id text,
  title text not null,
  type text not null check (type in ('north', 'phase', 'subject', 'project', 'habit')),
  period text,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null,
  description text,
  focus jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.goal_tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  goal_ids jsonb not null default '[]'::jsonb,
  phase_id text,
  category text,
  title text not null,
  description text,
  target numeric not null default 0,
  current numeric not null default 0,
  unit text,
  daily_target text,
  status text not null check (status in ('ahead', 'normal', 'behind')),
  priority text check (priority in ('高', '中', '低')),
  execution_mode text check (execution_mode in ('孩子自主', '家长陪练', '亲子共学', '家长验收')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.goal_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  date date not null,
  category text,
  summary text,
  amount text,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.growth_events (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id text,
  type text not null,
  category text,
  title text not null,
  description text,
  date date,
  year integer,
  tags jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text,
  happened_at date,
  payload jsonb not null default '{}'::jsonb,
  is_milestone boolean not null default false,
  is_highlight boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.growth_events add column if not exists student_id text;
alter table public.growth_events add column if not exists category text;
alter table public.growth_events add column if not exists description text;
alter table public.growth_events add column if not exists date date;
alter table public.growth_events add column if not exists year integer;
alter table public.growth_events add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.growth_events add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.growth_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.growth_events add column if not exists source text;

create table if not exists public.pathway_stages (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  period text,
  status text not null check (status in ('done', 'current', 'next', 'future')),
  summary text,
  targets jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table if not exists public.integration_push_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  title text,
  status text not null check (status in ('success', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists goals_user_parent_idx on public.goals(user_id, parent_id);
create index if not exists goal_tasks_user_goal_idx on public.goal_tasks(user_id, goal_id);
create index if not exists goal_logs_user_goal_date_idx on public.goal_logs(user_id, goal_id, date desc);
create index if not exists growth_events_user_type_idx on public.growth_events(user_id, type);
create index if not exists pathway_stages_user_order_idx on public.pathway_stages(user_id, sort_order);
create index if not exists integration_push_logs_user_created_idx on public.integration_push_logs(user_id, created_at desc);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists goal_tasks_set_updated_at on public.goal_tasks;
create trigger goal_tasks_set_updated_at before update on public.goal_tasks
for each row execute function public.set_updated_at();

drop trigger if exists growth_events_set_updated_at on public.growth_events;
create trigger growth_events_set_updated_at before update on public.growth_events
for each row execute function public.set_updated_at();

drop trigger if exists pathway_stages_set_updated_at on public.pathway_stages;
create trigger pathway_stages_set_updated_at before update on public.pathway_stages
for each row execute function public.set_updated_at();

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at before update on public.integrations
for each row execute function public.set_updated_at();

alter table public.students enable row level security;
alter table public.goals enable row level security;
alter table public.goal_tasks enable row level security;
alter table public.goal_logs enable row level security;
alter table public.growth_events enable row level security;
alter table public.pathway_stages enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_push_logs enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students',
    'goals',
    'goal_tasks',
    'goal_logs',
    'growth_events',
    'pathway_stages',
    'integrations',
    'integration_push_logs'
  ]
  loop
    execute format('drop policy if exists "%s_service_role_all" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_user_select_own" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_user_insert_own" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_user_update_own" on public.%I', table_name, table_name);
    execute format('drop policy if exists "%s_user_delete_own" on public.%I', table_name, table_name);

    execute format('create policy "%s_service_role_all" on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')', table_name, table_name);
    execute format('create policy "%s_user_select_own" on public.%I for select using (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy "%s_user_insert_own" on public.%I for insert with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy "%s_user_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name, table_name);
    execute format('create policy "%s_user_delete_own" on public.%I for delete using (auth.uid() = user_id)', table_name, table_name);
  end loop;
end;
$$;
