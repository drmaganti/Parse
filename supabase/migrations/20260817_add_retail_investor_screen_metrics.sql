-- Additive fields for experienced-retail-investor screens.
-- All columns are nullable so existing rows and production reads remain backward-compatible.
alter table public.stocks
  add column if not exists forward_pe double precision,
  add column if not exists peg double precision,
  add column if not exists forward_peg double precision,
  add column if not exists earnings_yield double precision,
  add column if not exists div_growth_5y double precision,
  add column if not exists payout_ratio double precision,
  add column if not exists roe double precision,
  add column if not exists gross_margin double precision,
  add column if not exists current_ratio double precision,
  add column if not exists quick_ratio double precision;
