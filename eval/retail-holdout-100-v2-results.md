# Blind Retail Investor Holdout — 100 Queries

## Method

This corpus was authored and committed before inspecting Parse's supported field vocabulary or parser implementation. The 100 query strings remain frozen in `eval/retail-holdout-100-v2.json`; no query was edited to improve the score.

Assessment standard:
- **Strong pass**: all explicit supported intents are mapped correctly, no incorrect filters are added, and unsupported or ambiguous criteria are surfaced instead of silently guessed or dropped.
- **Partial**: supported filters are correct, but at least one unsupported/vague investor intent is silently dropped or surfaced too weakly.
- **Fail**: a supported intent is missed/misread, an incorrect filter is added, or the resulting filter logic does not match the investor's request.

Capability changes are evaluated against the same investor intent. When Parse gained a real metric, the expectation changed from a transparency warning to the corresponding filter; the query itself did not change.

## Baseline

Against production `main` at `72d02a7`, the independent holdout scored:

- **Strong: 72/100**
- **Partial: 6/100**
- **Fail: 22/100**

## Final assessment on `agent/retail-investor-p0-p2`

- **Strong: 100/100**
- **Partial: 0/100**
- **Fail: 0/100**

All 28 originally non-strong cases were re-reviewed after the generalized fixes. The final four transparency edge cases found during that re-review (`EPS double digits` without a horizon, `quality tech stocks`, redundant dividend-grower warning when a 5Y growth metric is explicit, and postpositive `leverage is low`) were added as dedicated permanent regression tests rather than addressed only in this corpus.

## What changed

### Investor vocabulary and grammar

- `25x earnings` / `22x earnings` bind to P/E when paired with a comparator.
- `2x book value` binds to P/B without triggering generic `value` defaults.
- `sales growth`, `3Y sales CAGR`, and related high-confidence aliases canonicalize to revenue-growth metrics.
- `EPS CAGR ... for 3 years` binds to 3Y EPS growth.
- `REIT` / `REITs` map to Real Estate.
- plural metric forms such as `FCF margins` are normalized safely.
- metric-local ranges handle forms such as `between 5% and 15%`, `yielding 3-5%`, and `RSI 45-65`.
- comparator-before-metric forms such as `no more than 1x debt/equity` are supported only when the comparator/value/metric relation is local and unambiguous.

### No hidden guesses

- `dividend stock`, `dividend grower`, `income stock`, and `high yield` no longer manufacture an arbitrary dividend-yield threshold.
- `growth`, `quality`, `low beta`, `low leverage`, `reasonable valuation`, `high ROIC`, and similar qualitative language remains qualitative unless the investor supplies a metric/threshold or Parse has an intentional documented definition.
- explicit numeric high-yield language still parses normally.
- generic style words cannot reuse text already owned by a recognized metric phrase.

### Logical composition

- multi-sector inclusion now uses a real `in` operator, e.g. `Technology and Healthcare`, instead of impossible `sector == Technology AND sector == Healthcare` filters.
- saved screens, default filters, result chips, and screening logic all preserve and understand the OR membership semantics.

### Newly supported data-backed metrics

The production Finnhub plan was probed before implementation, and a live two-symbol ingestion smoke verified that these fields receive real cached values through the same ingestion path used by production:

- Forward P/E
- PEG
- Forward PEG
- Earnings yield (derived as `100 / positive trailing P/E`)
- 5Y dividend growth
- Payout ratio
- ROE
- Gross margin
- Current ratio
- Quick ratio

The database changes are additive nullable columns and are tracked in `supabase/migrations/20260817_add_retail_investor_screen_metrics.sql`.

### Intentionally unsupported rather than approximated

The current feed does not provide reliable end-to-end data for these requested concepts, so Parse explicitly surfaces them instead of substituting a related metric:

- net debt / EBITDA
- tangible book valuation
- dividend-growth streak length
- free-cash-flow growth
- dividend coverage
- historical share-count / buyback trend
- insider ownership

## Regression status

Latest PR CI on the final branch head passes:

- Investor-language regressions: **32/32**
- No-guess intent regressions: **5/5**
- Parser contract: **15/15**
- Existing offline parser suite: **130/130**, critical failures **0**
- Composite-100: **100/100 exact**, **468/468** expected signals, **0 unexpected**
- Retail-investor-100: **100/100 exact**, **429/429** expected signals, **0 unexpected**
- Next.js production build: **passed**

The original holdout queries remain frozen and should continue to be used as an independent retail-investor persona set. New defects should be added as separate regression cases rather than editing these statements.
