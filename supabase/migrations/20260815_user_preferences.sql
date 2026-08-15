create table if not exists public.user_preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  field       text not null,
  op          text not null check (op in ('<', '<=', '>', '>=', '==', '!=')),
  value       jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists user_preferences_user_idx
  on public.user_preferences (user_id, created_at asc);

alter table public.user_preferences enable row level security;

drop policy if exists "own preferences select" on public.user_preferences;
create policy "own preferences select" on public.user_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "own preferences write" on public.user_preferences;
create policy "own preferences write" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
