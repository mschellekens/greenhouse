-- Greenhouse schema for Supabase (Postgres). NOT YET CONNECTED.
-- Events are the source of truth; scores/conditions are derived, never stored.
-- Apply with: supabase db push  (or paste into the SQL editor)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone    text not null default 'UTC',
  map_order   text not null default 'attention' check (map_order in ('attention','custom','category')),
  default_view text not null default 'map' check (default_view in ('map','garden')),
  habit_count_goal integer check (habit_count_goal between 1 and 50),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  emoji       text,
  type        text not null check (type in ('frequency','limit','quantity')),
  direction   text not null default 'more' check (direction in ('more','maintain','less')),
  category    text check (category in ('Movement','Health','Mind','Relationships','Recovery','Lifestyle')),
  importance  smallint not null default 2 check (importance between 1 and 3),
  preferred_days smallint[] not null default '{}',
  complete_logging_since date,          -- limit habits: user logs every occurrence from this day
  plant       text not null check (plant in ('olive','fern','ficus','monstera','lavender','ivy','rosemary')),
  keywords    text[] not null default '{}',
  start_date  date not null,
  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

-- Versioned goals: a goal change inserts a new row; history keeps old goals.
create table if not exists public.habit_goals (
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null references public.habits (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  target         numeric not null check (target >= 0),
  window_days    integer not null check (window_days between 1 and 90),   -- rolling window
  count_mode     text not null default 'days' check (count_mode in ('days','events')),
  min_spacing_days integer check (min_spacing_days >= 0),
  unit           text,
  quantity_mode  text check (quantity_mode in ('total','average')),
  created_at     timestamptz not null default now(),
  unique (habit_id, effective_from)
);

create table if not exists public.habit_pauses (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  end_date   date,
  reason     text,
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  habit_id    uuid not null references public.habits (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  local_date  date not null,           -- calendar day in the user's timezone at log time
  occurred_at timestamptz not null,
  quantity    numeric,                 -- 0 = explicit "none" check-in for limit habits
  unit        text,
  note        text,
  source      text not null default 'manual' check (source in ('quick','text','manual','demo','llm','integration')),
  integration_id  uuid,                -- set when imported
  source_event_id text,                -- provider's id; dedupes re-imports
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz              -- soft delete enables undo
);
create unique index if not exists events_source_dedupe on public.events (user_id, integration_id, source_event_id) where source_event_id is not null;
create index if not exists events_habit_date_idx on public.events (habit_id, local_date) where deleted_at is null;
create index if not exists events_user_idx on public.events (user_id);

-- Planned integrations (none implemented yet). Opt-in, minimum scopes.
create table if not exists public.integration_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  provider    text not null check (provider in ('apple_health','health_connect','strava','oura')),
  scopes      text[] not null default '{}',
  status      text not null default 'disconnected' check (status in ('connected','disconnected','error')),
  last_sync_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, provider)
);

-- Row level security: every row belongs to exactly one user.
alter table public.integration_connections enable row level security;
create policy "own integrations" on public.integration_connections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.profiles     enable row level security;
alter table public.habits       enable row level security;
alter table public.habit_goals  enable row level security;
alter table public.habit_pauses enable row level security;
alter table public.events       enable row level security;

create policy "own profile"  on public.profiles     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habits"   on public.habits       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals"    on public.habit_goals  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pauses"   on public.habit_pauses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events"   on public.events       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child rows must point at a habit the same user owns.
create or replace function public.ensure_habit_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'habit does not belong to user';
  end if;
  return new;
end $$;

create trigger goals_owner  before insert or update on public.habit_goals  for each row execute function public.ensure_habit_owner();
create trigger pauses_owner before insert or update on public.habit_pauses for each row execute function public.ensure_habit_owner();
create trigger events_owner before insert or update on public.events       for each row execute function public.ensure_habit_owner();
