# MoneyFlock-style blind 50 v3 — results

- Frozen before first execution.
- Freeze SHA-256: `95faf4115ce5cc453e96972d0da0370281752448f91a21d4e53f79ae4b87ca3f`
- Baseline: current `main` at test start (`31599475e79bd3c349ab5cb2fab13667b43acd90`).
- Result: **21 PASS / 29 PARTIAL / 0 FAIL**.
- All existing production regression suites and the production build passed before this new holdout ran.

| ID | Statement | Parse result | Status | Gap |
|---|---|---|---|---|
| N01 | Tech businesses turning a profit, sales climbing more than 17%, debt kept low, valuation looks fair. | Technology | PARTIAL | Missing profitability, revenue growth, low debt, valuation |
| N02 | Healthcare firms making money with top-line growth above 11%, not much debt, and a sensible price. | Revenue Growth >11%; Operating Margin >0%; Healthcare | PARTIAL | Missing low debt and valuation |
| N03 | Software stocks that are profitable, revenue rising at least 16%, leverage on the low side, and not overpriced. | Operating Margin >0%; Technology | PARTIAL | Missing Revenue Growth >=16%, low debt, valuation |
| N04 | Banks in the black, sales increasing over 6%, modest leverage, reasonably priced. | Operating Margin >0% | PARTIAL | Missing revenue growth, low debt, valuation, Financials sector |
| N05 | Industrial companies with positive earnings, revenue up 9%+, low debt, fair valuation. | P/E <25; Operating Margin >0%; D/E <1; Industrials | PARTIAL | Missing Revenue Growth >=9% |
| N06 | Energy names earning money, growing sales by more than 8%, lightly leveraged, not expensive. | P/E <25; Revenue Growth >8%; D/E <1; Energy | PARTIAL | Missing profitability |
| N07 | Profitable consumer stocks, top line up above 13%, debt under control, valuation not excessive. | Operating Margin >0%; Consumer | PARTIAL | Missing Revenue Growth >13%, low debt, valuation |
| N08 | Biotech companies making a profit, revenue growth north of 14%, little debt, fairly valued. | P/E <25; Revenue Growth >14%; D/E <1; Healthcare | PARTIAL | Missing profitability |
| N09 | REITs with positive earnings, sales growth over 5%, low leverage, sensible valuation. | P/E <25; Revenue Growth >5%; Operating Margin >0%; D/E <1; Real Estate | PASS | Exact |
| N10 | Materials companies in the black, revenue increasing above 7%, minimal debt, fairly priced. | Operating Margin >0%; D/E <1; Materials | PARTIAL | Missing Revenue Growth >7% and valuation |
| N11 | Low-debt tech stocks with a fair valuation that are profitable and growing revenue more than 20%. | P/E <25; Revenue Growth >20%; Operating Margin >0%; Technology | PARTIAL | Missing D/E <1 |
| N12 | Reasonably valued healthcare stocks with little leverage, positive earnings and sales growth above 12%. | P/E <25; Revenue Growth >12%; Operating Margin >0%; Healthcare | PARTIAL | Missing D/E <1 |
| N13 | Show low-leverage software companies, profitable, with revenue up over 18% and a sensible valuation. | P/E <25; Revenue Growth >18%; Operating Margin >0%; Technology | PARTIAL | Missing D/E <1 |
| N14 | Fairly valued industrials that make money, have modest debt and double-digit sales growth. | P/E <25; Revenue Growth >=10%; D/E <1; Industrials | PARTIAL | Missing profitability |
| N15 | Not-expensive consumer companies with low debt, positive earnings and revenue growth at least 10%. | Revenue Growth >=10%; Operating Margin >0%; D/E <1; Consumer | PARTIAL | Missing valuation |
| N16 | Profitable utilities: low leverage, fair valuation, sales increasing more than 4%. | P/E <25; Operating Margin >0%; D/E <1; Utilities | PARTIAL | Missing Revenue Growth >4% |
| N17 | Bank stocks with reasonable valuation and low debt; also profitable with revenue growing above 7%. | P/E <25; Revenue Growth >7%; Operating Margin >0%; D/E <1; Financials | PASS | Exact |
| N18 | Energy companies with a sensible valuation, little debt, making money, top-line growth over 9%. | P/E <25; Revenue Growth >9%; Operating Margin >0%; D/E <1; Energy | PASS | Exact |
| N19 | Semiconductor firms with modest debt, profitable operations, fair valuation, and sales up more than 21%. | P/E <25; Revenue Growth >21%; Operating Margin >0%; D/E <1; Technology | PASS | Exact |
| N20 | Pharma stocks: not too pricey, low leverage, in the black, revenue rising over 10%. | P/E <25; Operating Margin >0%; D/E <1; Healthcare | PARTIAL | Missing Revenue Growth >10% |
| N21 | Profitable tech stocks growing revenue over 20%, debt/equity under 0.6, P/E below 27. | P/E <27; Revenue Growth >20%; Operating Margin >0%; D/E <0.6; Technology | PASS | Exact |
| N22 | Healthcare companies with operating margin above 7%, sales growth above 12%, D/E below 0.5, P/E under 26. | P/E <26; Revenue Growth >12%; Operating Margin >7%; D/E <0.5; Healthcare | PASS | Exact |
| N23 | Software firms making money with revenue growth >18%, low debt and forward P/E below 24. | Revenue Growth >18%; Forward P/E <24; Operating Margin >0%; D/E <1; Technology | PASS | Exact |
| N24 | Profitable banks with sales growth >8%, debt/equity <0.9 and P/B <2. | P/B <2; Revenue Growth >8%; Operating Margin >0%; D/E <0.9 | PARTIAL | Missing Financials sector |
| N25 | Industrial companies with operating margin >6%, revenue growth >10%, low leverage and EV/EBITDA <13. | Revenue Growth >10%; Operating Margin >6%; D/E <1; EV/EBITDA <13; Industrials | PASS | Exact |
| N26 | Energy stocks with positive earnings, sales growth >9%, D/E <0.7 and P/E <19. | P/E <19; Revenue Growth >9%; Operating Margin >0%; D/E <0.7; Energy | PASS | Exact |
| N27 | Consumer companies in the black, revenue growth between 8% and 16%, low debt, P/E under 23. | Revenue Growth >=8% and <=16%; P/E <23; Operating Margin >0%; D/E <1; Consumer | PASS | Exact |
| N28 | Biotech names with positive earnings, revenue growth above 15%, D/E below 0.8 and P/S under 7. | P/S <7; Revenue Growth >15%; Operating Margin >0%; D/E <0.8; Healthcare | PASS | Exact |
| N29 | Profitable semiconductor stocks growing revenue >22%, high ROIC, low debt, P/E <30. | P/E <30; Revenue Growth >22%; ROIC >15%; Operating Margin >0%; D/E <1; Technology | PASS | Exact |
| N30 | Healthcare growth companies with operating margin >5%, low leverage and forward P/E under 28. | Revenue Growth >15%; Forward P/E <28; Operating Margin >5%; D/E <1; Healthcare | PASS | Exact |
| N31 | Profitable tech companies with sales up double digits, low debt and reasonable valuation. | P/E <25; Operating Margin >0%; D/E <1; Technology | PARTIAL | Missing Revenue Growth >=10% |
| N32 | Profitable healthcare names with revenue up 15%+, low leverage, fair valuation. | P/E <25; Operating Margin >0%; D/E <1; Healthcare | PARTIAL | Missing Revenue Growth >=15% |
| N33 | Software stocks making money with top-line growth no less than 12%, little debt and not expensive. | P/E <25; Revenue Growth >=12%; Operating Margin >0%; D/E <1; Technology | PASS | Exact |
| N34 | Bank companies in the black with sales growth north of 5%, modest debt and fairly valued. | P/E <25; Revenue Growth >5%; Operating Margin >0%; D/E <1; Financials | PASS | Exact |
| N35 | Industrials with positive earnings, revenue growth greater than 9%, conservative leverage and a sensible valuation. | P/E <25; Revenue Growth >9%; Operating Margin >0%; D/E <1; Industrials | PASS | Exact |
| N36 | Energy stocks turning a profit with sales expanding above 8%, minimal debt and fair valuation. | P/E <25; Revenue Growth >8%; D/E <1; Energy | PARTIAL | Missing profitability |
| N37 | Consumer names making money, revenue growing by more than 11%, low debt and reasonably priced. | Operating Margin >0%; D/E <1; Revenue Growth >0%; Consumer | PARTIAL | Wrong growth threshold (>0 instead of >11) and missing valuation |
| N38 | Profitable pharma companies with 3-year revenue CAGR above 10%, low leverage and reasonable valuation. | P/E <25; 3Y Revenue CAGR >10%; Operating Margin >0%; D/E <1; Healthcare | PASS | Exact |
| N39 | Profitable tech firms with 3Y EPS CAGR over 14%, low debt and reasonable valuation. | P/E <25; 3Y EPS CAGR >14%; Operating Margin >0%; D/E <1; Technology | PASS | Exact |
| N40 | Profitable semiconductor companies with revenue growth from 15% to 25%, low debt and fair valuation. | P/E <25; Operating Margin >0%; D/E <1; Technology | PARTIAL | Missing Revenue Growth range 15%-25% |
| N41 | Profitable software-as-a-service companies growing revenue over 20%, low debt and reasonable valuation. | P/E <25; Revenue Growth >20%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Technology sector |
| N42 | Chipmakers making money, sales growth above 18%, low leverage and fair valuation. | P/E <25; Revenue Growth >18%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Technology sector |
| N43 | Drug makers with positive earnings, revenue growth over 9%, little debt and sensible valuation. | P/E <25; Revenue Growth >9%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Healthcare sector |
| N44 | Lenders that are profitable, top-line growth above 6%, low leverage and not expensive. | P/E <25; Revenue Growth >6%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Financials sector |
| N45 | Oil and gas companies in the black, sales growth over 7%, low debt and reasonable valuation. | P/E <25; Revenue Growth >7%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Energy sector |
| N46 | Power utilities making money, revenue growth above 4%, modest debt and fair valuation. | P/E <25; Revenue Growth >4%; Operating Margin >0%; D/E <1; Utilities | PASS | Exact |
| N47 | Property REITs with positive earnings, sales rising over 6%, low leverage and reasonable valuation. | P/E <25; Operating Margin >0%; D/E <1; Real Estate | PARTIAL | Missing Revenue Growth >6% |
| N48 | Communication-services stocks that are profitable, revenue growth above 8%, low debt and fairly valued. | P/E <25; Revenue Growth >8%; Operating Margin >0%; D/E <1 | PARTIAL | Missing Communications sector |
| N49 | Basic materials firms making money, sales growth above 7%, little debt and sensible valuation. | P/E <25; Revenue Growth >7%; Operating Margin >0%; D/E <1; Materials | PASS | Exact |
| N50 | Retail consumer companies with positive earnings, revenue growth above 9%, low leverage and not expensive. | P/E <25; Revenue Growth >9%; Operating Margin >0%; D/E <1; Consumer | PASS | Exact |

## Findings

- The blind set was intentionally broader in phrasing while preserving the same core MoneyFlock intent: profitability + growth + manageable leverage + reasonable valuation, often with a sector/industry.
- The largest gaps are phrase coverage for profitability (`turning a profit`, `earning money`), growth (`sales climbing/increasing`, `revenue rising`, `sales up double digits`, `from X to Y`), and leverage/valuation (`debt kept low`, `not much debt`, `not overpriced`, `reasonably/fairly priced`).
- Industry aliases also remain incomplete for `software-as-a-service`, `chipmakers`, `drug makers`, `lenders`, `oil and gas`, and `communication-services`.
- N37 is the most serious semantic defect: `revenue growing by more than 11%` became `Revenue Growth >0%` instead of `>11%`.
- In the logged parser results, the missing criteria in the PARTIAL cases were not explicitly surfaced as unresolved criteria; the assumptions shown were only for criteria that had already been mapped to Parse defaults. This means the final coverage reconciliation still has blind spots for previously unseen wording.
