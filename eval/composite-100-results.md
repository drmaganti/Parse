# Composite 100 Parser Evaluation

## Scope

Independent composite screening evaluation against the span-owned deterministic parser.

- 100 screening statements
- 4 distinct indicators per statement
- 20 supported indicators covered
- Every indicator appears exactly 20 times
- Five wording/threshold variants per indicator
- 99 unique indicator combinations
- Validation compares exact field + operator + value signals and flags missing or unexpected filters
- The 100-statement corpus was kept unchanged while the parser architecture was fixed

## Final result

- Exact statement pass rate: **100/100 (100.0%)**
- Expected signals matched: **468/468 (100.0%)**
- Unexpected signals: **0**
- Parser source: **100/100 deterministic rules**
- Existing offline parser suite: **130/130 (100.0%)**
- Critical failures: **0**
- Parser contract tests: **15/15**
- Composite intent + sector regressions: **passed**

### Expected signal accuracy by indicator

| Indicator | Matched | Expected | Accuracy |
|---|---:|---:|---:|
| P/E | 24 | 24 | 100% |
| P/B | 24 | 24 | 100% |
| P/S | 24 | 24 | 100% |
| Dividend yield | 24 | 24 | 100% |
| Beta | 24 | 24 | 100% |
| Market cap | 24 | 24 | 100% |
| Revenue growth | 24 | 24 | 100% |
| ROIC | 24 | 24 | 100% |
| Operating margin | 24 | 24 | 100% |
| FCF margin | 24 | 24 | 100% |
| FCF yield | 24 | 24 | 100% |
| Debt / equity | 24 | 24 | 100% |
| Interest coverage | 24 | 24 | 100% |
| Revenue growth 3Y | 24 | 24 | 100% |
| EPS growth 3Y | 24 | 24 | 100% |
| EV / EBITDA | 24 | 24 | 100% |
| RSI | 24 | 24 | 100% |
| % off 52-week high | 20 | 20 | 100% |
| 1-week change | 20 | 20 | 100% |
| Sector | 20 | 20 | 100% |

## Architectural change

The deterministic parser now assigns recognized metric phrases to owned text spans before applying generic investment-language rules.

1. Compound/specific metrics claim their phrase first, e.g. `enterprise value to EBITDA`, `FCF yield`, and `3-year revenue growth`.
2. Each metric is parsed against a field-scoped view of the query where phrases owned by other metrics are masked.
3. Generic intents such as `value`, `growth`, or `high yield` run only against unowned text.
4. Operators and numeric thresholds remain outside the masked phrase so each metric can bind to its own nearby condition.

This removes cross-metric collisions without relying on query-global exception flags.

## Previously failing collision classes — now passing

- `enterprise value to EBITDA` no longer triggers generic value-investing P/E/P/B defaults.
- FCF-yield ranges no longer create dividend-yield ranges.
- 3-year revenue-growth ranges no longer create current revenue-growth ranges.
- Current revenue growth and 3-year revenue growth can coexist in the same query.
- FCF yield and dividend yield can coexist in the same query without suppressing one another.

## Reproduction

Run:

```bash
npm run eval:composite100
```

Set `PRINT_COMPOSITE100=1` to print all 100 generated statements.
