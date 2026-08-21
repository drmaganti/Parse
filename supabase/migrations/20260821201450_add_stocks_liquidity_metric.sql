alter table public.stocks add column if not exists avg_volume_20d numeric;
comment on column public.stocks.avg_volume_20d is '20-trading-day average daily share volume, in millions of shares per day.';
create index if not exists stocks_avg_volume_20d_idx on public.stocks (avg_volume_20d desc);
