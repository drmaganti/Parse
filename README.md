# Parse — natural-language stock screener

Describe a screen in plain English. It becomes an editable filter set you can
tune by hand, run against a nightly-cached US universe, and save to your account.

This repo is the **live-data production build**. The interaction (query → editable
interpretation → ranked results) is the same one proven in the prototype; here the
numbers come from a real feed instead of sample data.

## Architecture (runs at $0)

```
GitHub Action (nightly)                Next.js on Vercel
  scripts/ingest.ts                      app/  (UI, ported from prototype)
  ├─ read data/universe.json             api/parse   → Groq (NL → filters)   [slice 2]
  ├─ Finnhub free  (rate-limited)        api/screen  → query Supabase cache
  ├─ compute indicators locally          api/screens → save/load  (RLS)      [slice 2]
  └─ upsert → Supabase (stocks table)
                                         Supabase (free): Postgres + Auth
```

- **Finnhub free** — market data. 60 calls/min, personal/non-commercial. The nightly
  job is the *only* thing that calls it; the app never hits Finnhub directly, so one
  key covers all users and no key is ever exposed to the browser.
- **Indicators are computed locally** from candles (RSI, SMA), so no indicator calls.
- **Supabase free** — Postgres holds the cached universe; Auth handles accounts;
  Row Level Security scopes saved screens to their owner.
- **GitHub Actions** — nightly ingestion. Same pattern as the value-screener.
- **Groq (llama-3.3-70b)** — server-side NL→filter parsing (slice 2).

## What's in this slice (slice 1: data foundation)

| File | Role |
|---|---|
| `supabase/schema.sql` | tables, indexes, RLS policies |
| `data/universe.json` | the ticker universe (editable — seeded, expand to full S&P 500 + NDX 100) |
| `lib/fields.ts` | filter-field + ranking vocabulary, shared by ingest, screen, and UI |
| `lib/indicators.ts` | RSI / SMA from OHLCV |
| `lib/screen.ts` | screening + ranking engine over cached rows |
| `lib/finnhub.ts` | rate-limited Finnhub client (55/min, safe under the 60 cap) |
| `scripts/ingest.ts` | nightly pull → compute → upsert |
| `.github/workflows/ingest.yml` | nightly schedule |

## Slice 2: the parse step + eval (added)

| File | Role |
|---|---|
| `lib/llm.ts` | provider seam — Groq default, Google by one env var (`LLM_PROVIDER`) |
| `lib/parse.ts` | one model call → validated filters; sticky merge keeps user-locked chips on refine |
| `lib/fallback-parse.ts` | deterministic rule-based parser so the step degrades instead of erroring |
| `app/api/parse/route.ts` | `POST /api/parse` — runs server-side, key never reaches the browser |
| `eval/cases.json` | parse-quality cases (explicit + vague) |
| `eval/run.ts` | scores parse output; the record behind any future model/routing choice |

No orchestrator, no LangChain, no dual-model routing. The parse is a single clean
call behind a swappable provider. If a measured failure ever warrants it, the fix is
a one-line heuristic, not a framework.

### Run the eval

```bash
OFFLINE=1 npm run eval    # rule-based fallback, no key — CI smoke test (~11/12)
npm run eval              # the configured model (needs GROQ_API_KEY); fails CI under 70%
```

The offline pass measures the *fallback*, deliberately simple. The model path scores
higher; the harness exists so you decide Groq vs Google, or 70B vs 8B, on numbers.

**Remaining slice:** port the prototype UI into `app/` and wire Supabase auth +
a saved-screens API onto these endpoints. See the runbook below.

## Going to production — runbook

1. **Stand up data.** Create a Supabase project, run `supabase/schema.sql`, register
   for Finnhub, fill `.env.local`, `npm run ingest`. Confirm rows land in `stocks`.
2. **Schedule ingestion.** Add `FINNHUB_API_KEY`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets. The nightly workflow runs
   `npm run ingest`; trigger it once by hand to verify.
3. **Wire the model.** Add `GROQ_API_KEY` (and `LLM_PROVIDER=groq`). `npm run eval`
   and read the score. If vague queries parse badly, try `GROQ_MODEL=llama-3.3-70b`
   vs `8b-instant`, or flip `LLM_PROVIDER=google`, and re-run the eval to compare.
4. **Build the UI slice.** Port the approved prototype into `app/page.tsx`, replacing
   its local auth and storage with Supabase Auth and the saved-screens table, and
   pointing the query box at `/api/parse` and a `/api/screen` route that queries the
   `stocks` cache. This is the one piece not yet in the repo.
5. **Deploy.** Push to Vercel, set the same env vars in the project settings, ship.
6. **Before charging anyone.** Move Finnhub to a paid tier (the free tier is
   personal/non-commercial) — a config change behind `lib/finnhub.ts`, not a rewrite.

## Setup

1. **Supabase** — create a free project. Run `supabase/schema.sql` in the SQL editor.
   Copy the project URL, the anon key, and the service-role key.
2. **Finnhub** — register at finnhub.io, copy the free API key.
3. **Env** — copy `.env.example` to `.env.local` and fill it in.
4. **Ingestion secrets** — in the GitHub repo, add `FINNHUB_API_KEY`,
   `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as Actions secrets.

## Run the ingestion locally

```bash
npm install
npm run ingest         # pulls the universe, computes indicators, upserts to Supabase
```

The Action runs it nightly on a schedule; you can also trigger it by hand from the
Actions tab.

## A note on Finnhub candles

Indicator math needs daily candles (`/stock/candle`). If your Finnhub plan doesn't
include that endpoint, set `USE_CANDLES=false` in the env. Fundamentals still populate
fully; RSI and the SMAs stay null until the endpoint is available. Everything degrades
gracefully rather than failing the run.

## Licensing reminder

Finnhub's free tier is **personal, non-commercial**. This is fine for a $0 showcase
with no payment page. Adding billing means moving to a paid Finnhub tier — a config
change behind the same client, not a rewrite.
