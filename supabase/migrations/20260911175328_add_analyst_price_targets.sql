alter table public.stocks
  add column if not exists analyst_target_low numeric,
  add column if not exists analyst_target_median numeric,
  add column if not exists analyst_target_mean numeric,
  add column if not exists analyst_target_high numeric,
  add column if not exists analyst_target_updated_at timestamptz;
