-- Greenhouse schema for Supabase (Postgres). NOT YET CONNECTED.
-- Events are the source of truth; scores/conditions are derived, never stored.
-- Apply with: supabase db push  (or paste into the SQL editor)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone    text not null default 'UTC',
  map_order   text not null default 'attention' check (map_order in ('attention','custom','category')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('frequency','limit','quantity')),
  category    text not null default 'Other',
  plant       text not null check (plant in ('olive','fern','lavender','monstera','snake','succulent')),
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
  period         text not null check (period in ('day','week','month')),
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
  source      text not null default 'manual' check (source in ('quick','text','manual','demo','llm')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz              -- soft delete enables undo
);
create index if not exists events_habit_date_idx on public.events (habit_id, local_date) where deleted_at is null;
create index if not exists events_user_idx on public.events (user_id);

-- Row level security: every row belongs to exactly one user.
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
