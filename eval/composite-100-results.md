# Composite 100 Parser Evaluation

## Scope

Independent composite screening evaluation against the parser on `agent/intent-coverage-warnings`.

- 100 screening statements
- 4 distinct indicators per statement
- 20 supported indicators covered
- Every indicator appears exactly 20 times
- Five wording/threshold variants per indicator
- 99 unique indicator combinations
- Validation compares exact field + operator + value signals and flags missing or unexpected filters

## Result

- Exact statement pass rate: **89/100 (89.0%)**
- Expected signals matched: **466/468 (99.6%)**
- Unexpected signals: **21**
- Parser source: **100/100 deterministic rules**

### Expected signal accuracy by indicator

| Indicator | Matched | Expected | Accuracy |
|---|---:|---:|---:|
| P/E | 24 | 24 | 100% |
| P/B | 24 | 24 | 100% |
| P/S | 24 | 24 | 100% |
| Dividend yield | 23 | 24 | 95.8% |
| Beta | 24 | 24 | 100% |
| Market cap | 24 | 24 | 100% |
| Revenue growth | 23 | 24 | 95.8% |
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

## Failure clusters

### 1. `enterprise value` is interpreted as generic value-investing intent

Affected: C006, C031, C060, C082.

The phrase `enterprise value to EBITDA` contains the word `value`, which triggers the qualitative value rule and can add default P/E < 20 and/or P/B < 4 filters that the user did not request.

### 2. FCF-yield ranges also create dividend-yield ranges

Affected: C025, C048, C071, C098.

`FCF yield between ...` is correctly mapped to FCF yield, but the generic yield range matcher also adds the same bounds as dividend-yield filters.

### 3. 3-year revenue-growth ranges also create current revenue-growth ranges

Affected: C025, C049, C071.

`3-year revenue growth between ...` correctly maps to Revenue growth 3Y, but the generic revenue-growth range matcher also adds current revenue-growth bounds.

### 4. 3-year revenue growth can suppress a separately requested current revenue-growth threshold

Affected: C043.

When a Revenue growth 3Y filter is already present, the threshold path currently skips a separately requested current revenue-growth filter.

### 5. FCF yield can suppress an explicit dividend-yield threshold

Affected: C087.

The presence of `free cash flow yield` causes the explicit dividend-yield threshold matcher to be skipped globally. A later generic dividend rule then inserts a default dividend yield > 3% instead of the requested dividend yield < 6%.

## Failed statements

| Case | Statement | Validation issue |
|---|---|---|
| C006 | FCF yield at least 2.5%; enterprise value to EBITDA at most 18; FCF margin at least 8%; beta at most 0.95 | Unexpected P/E < 20 and P/B < 4 |
| C025 | 3-year revenue growth between 6 and 18%; FCF yield between 2 and 7%; FCF margin between 7 and 22%; EV/EBITDA between 7 and 16 | Unexpected current revenue-growth range and dividend-yield range |
| C031 | P/E at most 22; revenue growth at least 10%; beta at most 0.95; enterprise value to EBITDA at most 18 | Unexpected P/B < 4 |
| C043 | 3Y revenue CAGR at most 20%; RSI at least 50; revenue growth at most 25%; beta at least 0.8 | Missing current revenue growth <= 25 |
| C048 | RSI between 30 and 60; FCF yield between 2 and 7%; beta between 0.7 and 1.3; EV/EBITDA between 7 and 16 | Unexpected dividend-yield range |
| C049 | Interest coverage between 4 and 12; 3-year revenue growth between 6 and 18%; P/B between 1 and 5; exclude Utilities | Unexpected current revenue-growth range |
| C060 | P/E at most 22; FCF margin at least 8%; Healthcare; enterprise value to EBITDA at most 18 | Unexpected P/B < 4 |
| C071 | P/E between 9 and 21; FCF yield between 2 and 7%; 3-year revenue growth between 6 and 18%; operating margin between 8 and 25% | Unexpected dividend-yield and current revenue-growth ranges |
| C082 | Interest coverage at least 4; market cap at least $25B; operating margin at least 10%; enterprise value to EBITDA at most 18 | Unexpected P/E < 20 and P/B < 4 |
| C087 | ROIC below 30%; FCF yield below 10%; dividend yield below 6%; 3-year revenue CAGR below 25% | Missing dividend yield < 6; unexpected default dividend yield > 3 |
| C098 | ROIC between 8 and 20%; FCF yield between 2 and 7%; FCF margin between 7 and 22%; down at least 2% this week | Unexpected dividend-yield range |

## Reproduction

Run:

```bash
npm run eval:composite100
```

Set `PRINT_COMPOSITE100=1` to print all 100 generated statements.
