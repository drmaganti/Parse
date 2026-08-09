-- ============================================================
-- Parse — schema
-- Run in the Supabase SQL editor.
-- ============================================================

-- Cached universe. The nightly job upserts one row per symbol.
-- Read by the app (anon, read-only); written only by the service role.
create table if not exists public.stocks (
  symbol         text primary key,
  name           text not null,
  sector         text,
  price          numeric,
  market_cap     numeric,          -- USD billions
  pe             numeric,
  pb             numeric,
  ps             numeric,
  div_yield      numeric,          -- percent
  beta           numeric,
  rev_growth     numeric,          -- percent YoY
  rsi            numeric,          -- computed locally; null if candles unavailable
  sma50          numeric,
  sma200         numeric,
  from_52w_high  numeric,          -- percent below 52w high (negative)
  chg_1w         numeric,          -- percent
  chg_1d         numeric,          -- percent
  updated_at     timestamptz not null default now()
);

-- Helpful indexes for common screen sorts/filters.
create index if not exists stocks_market_cap_idx on public.stocks (market_cap desc);
create index if not exists stocks_pe_idx         on public.stocks (pe);
create index if not exists stocks_div_yield_idx  on public.stocks (div_yield desc);
create index if not exists stocks_sector_idx     on public.stocks (sector);

alter table public.stocks enable row level security;

-- Anyone (including anon) may read the cached universe.
drop policy if exists "stocks read" on public.stocks;
create policy "stocks read" on public.stocks
  for select using (true);
-- No insert/update/delete policy => only the service role can write.

-- ============================================================
-- Saved screens — one row per saved screen, owned by a user.
-- ============================================================
create table if not exists public.saved_screens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  query       text,
  filters     jsonb not null default '[]'::jsonb,
  ranking     text not null default 'marketCap',
  created_at  timestamptz not null default now()
);

create index if not exists saved_screens_user_idx on public.saved_screens (user_id, created_at desc);

alter table public.saved_screens enable row level security;

-- Owners can do anything with their own screens; nobody sees anyone else's.
drop policy if exists "own screens select" on public.saved_screens;
create policy "own screens select" on public.saved_screens
  for select using (auth.uid() = user_id);

drop policy if exists "own screens write" on public.saved_screens;
create policy "own screens write" on public.saved_screens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
