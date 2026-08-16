# Parse

Natural-language stock screening with explicit, inspectable filters.

Parse lets an investor describe the screen they want in plain English, converts that intent into structured financial criteria, and runs those criteria against a daily-refreshed stock universe. The AI interprets the request; the screening logic itself stays deterministic and visible.

## Current product

- Natural-language → structured stock filters
- Multiple conditions on the same metric (including ranges)
- Simple categorical exclusions
- Additive natural-language refinement
- Direct editing of filter thresholds
- Ranking and sorting
- Saved screens with exact structured state
- Explicit saved screening defaults
- Exact persistent sharing without reparsing
- Optional public screen publishing
- Curated SEO indexing for public screens (publishing alone does not automatically make a page indexable)
- Investor collections, starting with Berkshire Hathaway / Warren Buffett reported 13F holdings
- Guest experience with limited updates before signup

## Product principle

> Natural language changes structure; direct manipulation changes values.

The core workflow is:

> Describe → inspect → add/remove criteria → edit thresholds → run.

Parse is not a recommendation engine and does not ask an LLM to choose stocks. Structured filters are applied by the deterministic screening engine.

## Data

The primary market universe is currently the S&P 500 + Nasdaq 100, refreshed daily. Investor collection holdings are sourced from public SEC filings and are inherently delayed. A 13F collection represents the reporting manager's disclosed U.S. equity holdings, not an individual's personal brokerage account and not a real-time portfolio.

## Saved screens and monitoring foundation

Saved screens persist the exact filters, ranking, universe, last run time, result count, and prior result symbols. Parse also stores added/removed result snapshots when a saved screen is rerun with unchanged criteria. This is backend infrastructure for future monitoring/re-engagement; P1 does not expose change-history UI or send screen-change email alerts.

## Sharing and publishing

An exact shared screen stores structured filters and ranking so opening the link never needs to re-run the natural-language parser. Signed-in users can create:

- **Unlisted** links: accessible to anyone with the URL, not indexed.
- **Public** screens: discoverable inside Parse. Public screens remain `noindex` unless explicitly curated as indexable, which protects SEO quality from duplicate or low-value user-generated pages.

## Investor collections

`/investors` is the public collection hub. The first collection is `/investors/warren-buffett`, which presents Berkshire Hathaway's latest reported Form 13F holdings and lets a visitor screen that reported portfolio with Parse.

The SEC ingestion job aggregates duplicate 13F rows by CUSIP before calculating portfolio weights and mapping holdings to tickers. The workflow refreshes on weekdays and on relevant production changes.

## Development

```bash
npm install
npm run dev
```

### Checks

```bash
npm run test:p0-parser
npm run build
```

### Investor holdings refresh

Requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `SEC_USER_AGENT`

Then run:

```bash
npm run ingest:investors
```

## Environment

See `.env.example` for the current application and ingestion variables.

## Database

Supabase schema and migrations live under `supabase/`.

P1 adds:

- monitoring-ready fields to `saved_screens`
- `shared_screens`
- `investor_holdings`

All exposed tables use Row Level Security. Public investor holdings are read-only through policy; shared-screen writes are owner-scoped.

## Disclaimer

Parse is a research tool, not investment advice.
