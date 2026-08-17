# Retail Investor 100 Parser Evaluation

## Scope

100 manually authored stock-screening statements from an experienced retail-investor perspective. Every statement contains at least three investor intents/indicators. Mix: 20 value/quality, 20 growth/compounder, 15 income/defensive, 15 momentum, 15 sector/exclusion, and 15 semantic-stress cases. Expected interpretations were defined before running the parser.

An exact pass requires all expected field/operator/value signals, no unexpected filters, and required transparency for ambiguous or unsupported criteria.

## Result

- Exact statements: **88/100 (88.0%)**
- Expected signals: **415/426 (97.4%)**
- Unexpected signals: **4**

| Category | Passed |
|---|---:|
| Value / quality | 19/20 |
| Growth / compounder | 19/20 |
| Income / defensive | 13/15 |
| Momentum | 14/15 |
| Sector / exclusion | 14/15 |
| Semantic stress | 9/15 |

## Passed case IDs

R001-R012, R014-R027, R029-R048, R050-R051, R053-R057, R059-R071, R073-R094.

## Failed cases

| ID | Statement | Why it failed |
|---|---|---|
| R013 | Financial stocks with P/B between 0.8 and 2.5, ROIC above 9%, and beta below 1.2. | Missed sector: `Financial stocks` was not normalized to `Financials`. |
| R028 | Consumer growth names with 3-year EPS growth above 15%, operating margin over 12%, and market cap above $15 billion. | Added unexpected `revGrowth > 15%` from generic `growth names`. |
| R049 | Financial dividend stocks with yield over 3%, ROIC above 10%, and P/B under 2.5. | Missed sector: `Financial dividend stocks` was not normalized to `Financials`. |
| R052 | Large healthcare income stocks with dividend yield above 2%, beta under 1, and FCF yield above 3%. | Missed size intent: `Large ... stocks` did not map to market cap > $50B. |
| R058 | Financial stocks down over 4% this week, P/B under 2, and ROIC above 10%. | Missed sector: `Financial stocks` was not normalized to `Financials`. |
| R072 | Healthcare companies above $20 billion market cap, revenue growth above 10%, excluding Utilities. | Mis-bound the market-cap threshold: produced `marketCap > 10` by binding to the later revenue-growth value instead of `$20B`. |
| R095 | Tech stocks with forward P/E below 25, revenue growth above 15%, and ROIC over 12%. | Treated `forward P/E < 25` as ordinary P/E < 25 and did not warn that forward P/E is unsupported. |
| R096 | Financial stocks with earnings yield above 6%, P/B below 2, and beta under 1. | Missed `Financials` and treated `earnings yield > 6%` as dividend yield > 6% instead of surfacing it as unsupported. |
| R097 | Large tech names with D/E below 0.5, P/E below 30, and 3Y rev CAGR above 12%. | Missed `large` size intent, `D/E < 0.5`, and `3Y rev CAGR > 12%` shorthand. |
| R098 | Healthcare stocks with op margin above 15%, FCF yield above 3%, beta below 1, and P/E under 25. | Missed `op margin > 15%` shorthand for operating margin. |
| R099 | Consumer names with 3Y rev CAGR above 10%, 3Y EPS CAGR above 12%, P/S under 5, and beta below 1.2. | Missed `3Y rev CAGR > 10%`; `3Y EPS CAGR` parsed correctly. |
| R100 | Quality tech stocks: high ROIC, strong margins, low leverage, and reasonable valuation. | Only warned about low leverage and reasonable valuation; `high ROIC` and `strong margins` were silently unaccounted for. |

## Main failure clusters

1. Sector synonym gap: `Financial stocks` / `Financial dividend stocks` do not map to canonical `Financials`.
2. Common investor shorthand gaps: `D/E`, `3Y rev CAGR`, and `op margin` are not recognized.
3. Threshold-before-metric binding: `above $20B market cap` can bind to a later number.
4. Distinct-metric collisions: `forward P/E` is treated as ordinary P/E; `earnings yield` is treated as dividend yield.
5. Generic style language can invent a filter: `growth names` inserted `revGrowth > 15%`.
6. Vague-intent transparency is incomplete: `high ROIC` and `strong margins` can be silently dropped.

## Reproduction

Run `npm run eval:retail100`.
