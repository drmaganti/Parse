# Blind Retail Investor Holdout — 100 Queries

## Method

This corpus was authored and committed before inspecting Parse's current supported field vocabulary or parser implementation. The 100 queries are frozen in `eval/retail-holdout-100-v2.json` and were run unchanged against the parser from production `main` (72d02a7) on an evaluation-only branch.

Assessment standard:
- **Strong pass**: all explicit supported intents were mapped correctly, no incorrect filters were added, and unsupported criteria were surfaced when Parse recognized them as unsupported.
- **Partial**: supported filters were correct, but at least one unsupported/vague investor intent was silently dropped or surfaced too weakly.
- **Fail**: a supported intent was missed/misread, an incorrect filter was added, or the resulting filter logic did not match the investor's request.

## Result

- **Strong passes: 72/100**
- **Partial: 6/100**
- **Fails: 22/100**

Strong pass IDs:
H002, H004-H009, H011-H020, H023, H026-H027, H029-H031, H033-H034, H036-H037, H041-H042, H044-H048, H055-H060, H062-H063, H065-H077, H080-H094, H096-H097.

Partial IDs:
H039, H050, H095, H098, H099, H100.

Failed IDs:
H001, H003, H010, H021, H022, H024, H025, H028, H032, H035, H038, H040, H043, H049, H051, H052, H053, H054, H061, H064, H078, H079.

## Failure details

| ID | Investor wording | Problem |
|---|---|---|
| H001 | `trading below 25x earnings` | Missed P/E < 25. |
| H003 | `below 2x book value` | Did not map P/B < 2; `value` triggered generic value defaults (P/E < 20 and P/B < 4). |
| H010 | `REITs` | Dividend, beta and P/E parsed, but REITs did not map to Real Estate. |
| H021 | `sales growth above 15%`, `EPS growth above 12% over 3 years` | Both growth criteria were missed; only ROIC parsed. |
| H022 | `FCF margins above 12%` | Plural FCF-margin wording was missed. |
| H024 | `growth stocks` + explicit `revenue growth between 10% and 25%` | Explicit revenue-growth range was lost after style-language normalization. |
| H025 | `growing sales at least 8%` | Sales-growth synonym was not mapped to revenue growth. |
| H028 | `3-year sales CAGR above 12%` | Sales CAGR synonym was not mapped to 3Y revenue growth. |
| H032 | `EPS CAGR over 15% for 3 years` | Valid 3Y EPS-growth phrasing was missed. |
| H035 | `3-year revenue CAGR between 5% and 15%` | Range failed when the first bound carried `%`. |
| H038 | `growing both revenue and EPS double digits` | Double-digit growth shorthand was not translated; only low leverage was surfaced. |
| H040 | `3Y sales CAGR over 12%` | Sales CAGR synonym was not mapped. |
| H043 | `yielding between 3% and 6%` | Dividend-yield range was missed when the first bound carried `%`. |
| H049 | `no more than 1x debt/equity` | Threshold-before-metric debt/equity phrasing was missed. |
| H051 | `10+ year dividend growth streak`, `payout ratio under 65%` | Unsupported criteria were silently dropped and an unrequested default dividend-yield > 3% filter was added. |
| H052 | `High-yield stocks above 5%` | Produced default dividend yield > 3% instead of > 5%; dividend coverage / low leverage also were not fully surfaced. |
| H053 | `yielding 3-5%`, `positive earnings growth`, `low beta` | Parsed only yield > 3%; missed upper bound and low beta, and treated earnings-growth language as profitability. |
| H054 | `payout ratio below 50%`, `earnings growth above 8%` | Unsupported criteria were silently dropped and `Dividend stocks` invented yield > 3%. |
| H061 | `RSI 45-65` | Shorthand numeric range was missed. |
| H064 | `trade below 22x earnings` | Missed P/E < 22. |
| H078 | `Technology and healthcare stocks` | Generated two equality sector filters, which behave as AND rather than the investor-intended OR. |
| H079 | `Financials and industrials` | Same multi-sector OR issue. |

## Partial details

| ID | Gap |
|---|---|
| H039 | High ROIC and strong margins were surfaced, but `not-crazy valuations` was silently dropped. |
| H050 | Yield > 2 parsed, but 5Y dividend CAGR and payout-ratio criteria were silently dropped. |
| H095 | Revenue growth and operating margin parsed; unsupported gross margin was silently dropped. |
| H098 | P/E and FCF yield parsed; share-buyback intent was silently dropped. |
| H099 | Size, ROIC and debt/equity parsed; insider ownership was silently dropped. |
| H100 | High ROIC, strong margins, low leverage and reasonable valuation were surfaced, but the `quality` style intent itself was not. |

## Main clusters

1. **Investor synonyms/shorthand**: `25x earnings`, `book value`, `sales growth`, `3Y sales CAGR`, `EPS CAGR ... for 3 years`, `REITs`.
2. **Natural range syntax**: `5% and 15%`, `yielding 3-5%`, `RSI 45-65`.
3. **Threshold-before-metric syntax**: `no more than 1x debt/equity`.
4. **Dividend-screen heuristics**: generic dividend words can invent a yield threshold even when the investor asked about growth streaks or payout ratio instead.
5. **Sector OR semantics**: `Technology and Healthcare` is currently represented as impossible AND equality filters.
6. **Unsupported-intent transparency**: gross margin, payout ratio, dividend growth, buybacks, insider ownership and some valuation-style language can still disappear without a useful explanation.

This holdout set should remain frozen and be used as an independent persona regression suite if fixes are made.
