# Retail Investor 100 Parser Evaluation

## Scope

100 manually authored stock-screening statements from an experienced retail-investor perspective. Every statement contains at least three investor intents/indicators. Mix: 20 value/quality, 20 growth/compounder, 15 income/defensive, 15 momentum, 15 sector/exclusion, and 15 semantic-stress cases. Expected interpretations were defined before running the parser and the corpus was kept unchanged while the parser was fixed.

An exact pass requires all expected field/operator/value signals, no unexpected filters, and required transparency for ambiguous or unsupported criteria.

## Final result

- Exact statements: **100/100 (100.0%)**
- Expected signals: **426/426 (100.0%)**
- Unexpected signals: **0**

| Category | Passed |
|---|---:|
| Value / quality | **20/20** |
| Growth / compounder | **20/20** |
| Income / defensive | **15/15** |
| Momentum | **15/15** |
| Sector / exclusion | **15/15** |
| Semantic stress | **15/15** |

## Fixes validated by the frozen corpus

1. `Financial stocks`, `Financial dividend stocks`, and similar adjective forms now canonicalize to the `Financials` sector without broadly rewriting phrases such as `financial technology`.
2. Common experienced-investor shorthand now canonicalizes before parsing: `D/E` → debt/equity, `3Y rev CAGR` → 3-year revenue CAGR, and `op margin` → operating margin.
3. Size shorthand such as `large tech names` and `large healthcare income stocks` is interpreted as large-cap without changing ordinary `large companies` behavior.
4. Threshold-before-metric phrasing such as `above $20 billion market cap` is reordered internally so the threshold binds to market cap instead of a later metric value.
5. `Growth stocks/companies/names` is treated as an investment-style label rather than inventing a default revenue-growth threshold; explicit growth metrics and thresholds continue to parse normally.
6. Unsupported compound metrics are protected from semantic collisions: `forward P/E` is not treated as trailing P/E, and `earnings yield` is not treated as dividend yield. Both are surfaced explicitly as unsupported instead of being silently substituted.
7. Vague quality criteria such as `high ROIC` and `strong margins` now produce transparent assumptions asking for explicit thresholds rather than disappearing silently.

## Regression status

The same validation build also passed:

- Existing offline parser suite: **130/130 (100.0%)**
- Independent composite suite: **100/100 exact**
- Composite expected signals: **468/468 (100.0%)**
- Composite unexpected signals: **0**
- Parser contract: **15/15**
- Composite intent + sector regressions: **passed**
- Critical failures: **0**

## Reproduction

Run:

```bash
npm run eval:retail100
```

The 100-statement retail-investor corpus remains unchanged in `eval/retail-investor-100.json`.
