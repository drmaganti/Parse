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

-- P1: durable screens, monitoring-ready snapshots, exact public sharing, investor holdings.
alter table public.saved_screens add column if not exists updated_at timestamptz not null default now();
alter table public.saved_screens add column if not exists last_run_at timestamptz;
alter table public.saved_screens add column if not exists last_result_count integer;
alter table public.saved_screens add column if not exists last_result_symbols text[] not null default '{}'::text[];
alter table public.saved_screens add column if not exists last_added_symbols text[] not null default '{}'::text[];
alter table public.saved_screens add column if not exists last_removed_symbols text[] not null default '{}'::text[];
alter table public.saved_screens add column if not exists criteria_fingerprint text;
alter table public.saved_screens add column if not exists last_notified_at timestamptz;
alter table public.saved_screens add column if not exists universe text not null default 'default';

create table if not exists public.shared_screens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_saved_screen_id uuid references public.saved_screens (id) on delete set null,
  slug text not null unique,
  title text not null,
  query text,
  filters jsonb not null default '[]'::jsonb,
  ranking text not null default 'marketCap',
  universe text not null default 'default',
  visibility text not null default 'unlisted' check (visibility in ('unlisted','public')),
  created_at timestamptz not null default now()
);
create index if not exists shared_screens_owner_idx on public.shared_screens (owner_id, created_at desc);
create index if not exists shared_screens_public_idx on public.shared_screens (visibility, created_at desc);
alter table public.shared_screens enable row level security;
drop policy if exists "public shared screens read" on public.shared_screens;
create policy "public shared screens read" on public.shared_screens for select to anon, authenticated using (visibility = 'public');
drop policy if exists "own shared screens read" on public.shared_screens;
create policy "own shared screens read" on public.shared_screens for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "own shared screens write" on public.shared_screens;
create policy "own shared screens write" on public.shared_screens for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create table if not exists public.investor_holdings (
  id uuid primary key default gen_random_uuid(),
  collection_slug text not null,
  report_date date not null,
  filing_date date not null,
  accession_number text not null,
  issuer text not null,
  ticker text,
  title_class text,
  cusip text not null,
  shares numeric,
  value_usd numeric,
  portfolio_weight numeric,
  change_type text,
  share_change numeric,
  share_change_pct numeric,
  updated_at timestamptz not null default now(),
  unique (collection_slug, report_date, cusip)
);
create index if not exists investor_holdings_collection_idx on public.investor_holdings (collection_slug, report_date desc, value_usd desc);
alter table public.investor_holdings enable row level security;
drop policy if exists "investor holdings read" on public.investor_holdings;
create policy "investor holdings read" on public.investor_holdings for select to anon, authenticated using (true);

-- ============================================================
-- Feedback — anyone (signed in or not) can submit; nobody can read
-- back via the API. Read submissions in the Supabase table editor.
-- ============================================================
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  email       text,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert" on public.feedback
  for insert with check (true);
-- No select policy => submissions are write-only through the anon key.
