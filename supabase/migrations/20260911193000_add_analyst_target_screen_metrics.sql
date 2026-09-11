alter table public.stocks
  add column if not exists analyst_count integer,
  add column if not exists low_target_return_pct numeric,
  add column if not exists median_target_return_pct numeric,
  add column if not exists high_target_return_pct numeric,
  add column if not exists target_spread_pct numeric,
  add column if not exists target_risk_reward numeric;

comment on column public.stocks.low_target_return_pct is 'Return from current price to the low analyst target, in percentage points.';
comment on column public.stocks.median_target_return_pct is 'Return from current price to the median analyst target, in percentage points.';
comment on column public.stocks.high_target_return_pct is 'Return from current price to the high analyst target, in percentage points.';
comment on column public.stocks.target_spread_pct is 'High-minus-low analyst target range divided by the median target, in percentage points.';
comment on column public.stocks.target_risk_reward is 'Positive median-target return divided by absolute downside to the low target; null without both upside and downside.';
