import { parseQuery } from "../lib/parse";
import type { FilterValue, Op } from "../lib/fields";

type E = [string, Op, FilterValue];
type C = { id: string; cohort: "everyday" | "experienced"; q: string; e: E[]; a?: string[] };
const x = (field: string, op: Op, value: FilterValue): E => [field, op, value];

// Release holdout v2. Frozen in git before its first parser execution.
const cases: C[] = [
  { id:"U01", cohort:"everyday", q:"Tech companies making money with sales up more than 14%, modest debt and a fair valuation.", e:[x("sector","==","Technology"),x("operatingMargin",">",0),x("revGrowth",">",14),x("debtEquity","<",1),x("pe","<",25)] },
  { id:"U02", cohort:"everyday", q:"Healthcare companies in the black, revenue up at least 9%, little debt, not too pricey.", e:[x("sector","==","Healthcare"),x("operatingMargin",">",0),x("revGrowth",">=",9),x("debtEquity","<",1),x("pe","<",25)] },
  { id:"U03", cohort:"everyday", q:"Software names with double-digit revenue growth, low leverage and priced reasonably.", e:[x("sector","==","Technology"),x("revGrowth",">=",10),x("debtEquity","<",1),x("pe","<",25)] },
  { id:"U04", cohort:"everyday", q:"Bank stocks with positive net income, sales growth over 6%, and P/B under 1.8.", e:[x("sector","==","Financials"),x("operatingMargin",">",0),x("revGrowth",">",6),x("pb","<",1.8)] },
  { id:"U05", cohort:"everyday", q:"Semis growing revenue above 18%, high ROIC, D/E below 0.7.", e:[x("sector","==","Technology"),x("revGrowth",">",18),x("roic",">",15),x("debtEquity","<",0.7)] },
  { id:"U06", cohort:"everyday", q:"Utility names yielding over 3.5%, beta below 0.9 and P/E below 22.", e:[x("sector","==","Utilities"),x("divYield",">",3.5),x("beta","<",0.9),x("pe","<",22)] },
  { id:"U07", cohort:"everyday", q:"REITs with dividend yield between 4 and 7%, beta under 1.1.", e:[x("sector","==","Real Estate"),x("divYield",">=",4),x("divYield","<=",7),x("beta","<",1.1)] },
  { id:"U08", cohort:"everyday", q:"Industrial companies with operating margin over 10%, debt/equity under 0.8.", e:[x("sector","==","Industrials"),x("operatingMargin",">",10),x("debtEquity","<",0.8)] },
  { id:"U09", cohort:"everyday", q:"Consumer stocks with revenue up more than 8% and not expensive.", e:[x("sector","==","Consumer"),x("revGrowth",">",8),x("pe","<",25)] },
  { id:"U10", cohort:"everyday", q:"Biotech firms making money with 3Y revenue CAGR above 12% and P/S below 7.", e:[x("sector","==","Healthcare"),x("operatingMargin",">",0),x("revGrowth3Y",">",12),x("ps","<",7)] },
  { id:"U11", cohort:"everyday", q:"Materials names with revenue growth 10%+, low debt and fair price.", e:[x("sector","==","Materials"),x("revGrowth",">=",10),x("debtEquity","<",1),x("pe","<",25)] },
  { id:"U12", cohort:"everyday", q:"Energy growth stocks with reasonable valuation.", e:[x("sector","==","Energy"),x("revGrowth",">",15),x("pe","<",25)] },
  { id:"U13", cohort:"everyday", q:"Profitable pharma companies with high ROIC and low leverage.", e:[x("sector","==","Healthcare"),x("operatingMargin",">",0),x("roic",">",15),x("debtEquity","<",1)] },
  { id:"U14", cohort:"everyday", q:"Technology and Healthcare stocks with revenue growth over 15% and P/E under 30.", e:[x("sector","in","Technology|Healthcare"),x("revGrowth",">",15),x("pe","<",30)] },
  { id:"U15", cohort:"everyday", q:"Financials and Industrials with beta below 1 and P/B under 3.", e:[x("sector","in","Financials|Industrials"),x("beta","<",1),x("pb","<",3)] },
  { id:"U16", cohort:"everyday", q:"Avoid Energy and Utilities; P/E below 20, ROIC above 12%.", e:[x("sector","!=","Energy"),x("sector","!=","Utilities"),x("pe","<",20),x("roic",">",12)] },
  { id:"U17", cohort:"everyday", q:"Large software companies with revenue growth over 15% and forward P/E under 25.", e:[x("marketCap",">",50),x("sector","==","Technology"),x("revGrowth",">",15),x("forwardPe","<",25)] },
  { id:"U18", cohort:"everyday", q:"Large healthcare companies with ROE above 15% and debt/equity under 0.6.", e:[x("marketCap",">",50),x("sector","==","Healthcare"),x("roe",">",15),x("debtEquity","<",0.6)] },
  { id:"U19", cohort:"everyday", q:"Profitable semiconductor firms with >20% revenue growth and modest debt.", e:[x("sector","==","Technology"),x("operatingMargin",">",0),x("revGrowth",">",20),x("debtEquity","<",1)] },
  { id:"U20", cohort:"everyday", q:"Healthcare stocks with sales growth no less than 10%, reasonable valuation.", e:[x("sector","==","Healthcare"),x("revGrowth",">=",10),x("pe","<",25)] },
  { id:"U21", cohort:"everyday", q:"Financial names with earnings yield over 6%, dividend yield over 3%.", e:[x("sector","==","Financials"),x("earningsYield",">",6),x("divYield",">",3)] },
  { id:"U22", cohort:"everyday", q:"Consumer companies with FCF margin above 8% and free cash flow yield above 4%.", e:[x("sector","==","Consumer"),x("fcfMargin",">",8),x("fcfYield",">",4)] },
  { id:"U23", cohort:"everyday", q:"Industrials with interest coverage above 6 and current ratio above 1.5.", e:[x("sector","==","Industrials"),x("interestCoverage",">",6),x("currentRatio",">",1.5)] },
  { id:"U24", cohort:"everyday", q:"Tech names with quick ratio above 1.2, gross margin above 45%.", e:[x("sector","==","Technology"),x("quickRatio",">",1.2),x("grossMargin",">",45)] },
  { id:"U25", cohort:"everyday", q:"Profitable communications companies with 3-year EPS growth above 10%, low debt.", e:[x("sector","==","Communications"),x("operatingMargin",">",0),x("epsGrowth3Y",">",10),x("debtEquity","<",1)] },

  { id:"E01", cohort:"experienced", q:"Semiconductors: forward P/E <26, forward PEG <1.4, gross margin >48%, 3Y revenue CAGR >12%.", e:[x("sector","==","Technology"),x("forwardPe","<",26),x("forwardPeg","<",1.4),x("grossMargin",">",48),x("revGrowth3Y",">",12)] },
  { id:"E02", cohort:"experienced", q:"Healthcare compounders, ROE >20%, op margin >18%, 3Y EPS CAGR >14%, D/E <0.5.", e:[x("sector","==","Healthcare"),x("roe",">",20),x("operatingMargin",">",18),x("epsGrowth3Y",">",14),x("debtEquity","<",0.5)] },
  { id:"E03", cohort:"experienced", q:"Financials: P/B 0.8-1.8, earnings yield >7%, payout ratio <55%, 5Y dividend growth >4%.", e:[x("sector","==","Financials"),x("pb",">=",0.8),x("pb","<=",1.8),x("earningsYield",">",7),x("payoutRatio","<",55),x("divGrowth5Y",">",4)] },
  { id:"E04", cohort:"experienced", q:"Consumer: EV/EBITDA 8-14, FCF yield >4%, ROIC >15%, beta <1.1.", e:[x("sector","==","Consumer"),x("evEbitda",">=",8),x("evEbitda","<=",14),x("fcfYield",">",4),x("roic",">",15),x("beta","<",1.1)] },
  { id:"E05", cohort:"experienced", q:"Industrials with current ratio >1.5, quick ratio >1, interest coverage >7, D/E <0.8.", e:[x("sector","==","Industrials"),x("currentRatio",">",1.5),x("quickRatio",">",1),x("interestCoverage",">",7),x("debtEquity","<",0.8)] },
  { id:"E06", cohort:"experienced", q:"Energy with EV/EBITDA <9, FCF margin >10%, revenue growth >8%, beta <1.3.", e:[x("sector","==","Energy"),x("evEbitda","<",9),x("fcfMargin",">",10),x("revGrowth",">",8),x("beta","<",1.3)] },
  { id:"E07", cohort:"experienced", q:"Utilities: dividend yield 3.5-6%, 5Y dividend growth >3%, payout ratio <75%, beta <0.9.", e:[x("sector","==","Utilities"),x("divYield",">=",3.5),x("divYield","<=",6),x("divGrowth5Y",">",3),x("payoutRatio","<",75),x("beta","<",0.9)] },
  { id:"E08", cohort:"experienced", q:"REITs with market cap >$10B, dividend yield >4%, payout ratio <85%, beta <1.2.", e:[x("sector","==","Real Estate"),x("marketCap",">",10),x("divYield",">",4),x("payoutRatio","<",85),x("beta","<",1.2)] },
  { id:"E09", cohort:"experienced", q:"Technology and Healthcare with forward P/E <30, PEG <1.8, ROE >15%, gross margin >40%.", e:[x("sector","in","Technology|Healthcare"),x("forwardPe","<",30),x("peg","<",1.8),x("roe",">",15),x("grossMargin",">",40)] },
  { id:"E10", cohort:"experienced", q:"Exclude Real Estate and Energy; earnings yield >6%, ROIC >12%, beta <1.", e:[x("sector","!=","Real Estate"),x("sector","!=","Energy"),x("earningsYield",">",6),x("roic",">",12),x("beta","<",1)] },
  { id:"E11", cohort:"experienced", q:"Semis with P/S <8, 3Y EPS CAGR >15%, gross margin >50%, forward PEG <1.5.", e:[x("sector","==","Technology"),x("ps","<",8),x("epsGrowth3Y",">",15),x("grossMargin",">",50),x("forwardPeg","<",1.5)] },
  { id:"E12", cohort:"experienced", q:"Bank stocks with P/B <1.5, ROE >12%, payout ratio <60%, dividend yield >3%.", e:[x("sector","==","Financials"),x("pb","<",1.5),x("roe",">",12),x("payoutRatio","<",60),x("divYield",">",3)] },
  { id:"E13", cohort:"experienced", q:"Biotech companies with 3Y revenue CAGR >15%, operating margin >10%, FCF yield >3%, P/S <6.", e:[x("sector","==","Healthcare"),x("revGrowth3Y",">",15),x("operatingMargin",">",10),x("fcfYield",">",3),x("ps","<",6)] },
  { id:"E14", cohort:"experienced", q:"Software companies with earnings yield >5%, forward P/E <22, 3Y EPS CAGR >10%.", e:[x("sector","==","Technology"),x("earningsYield",">",5),x("forwardPe","<",22),x("epsGrowth3Y",">",10)] },
  { id:"E15", cohort:"experienced", q:"Materials with EV/EBITDA <11, interest coverage >8, D/E <0.7, current ratio >1.5.", e:[x("sector","==","Materials"),x("evEbitda","<",11),x("interestCoverage",">",8),x("debtEquity","<",0.7),x("currentRatio",">",1.5)] },
  { id:"E16", cohort:"experienced", q:"Energy companies with net debt/EBITDA below 1.5, EV/EBITDA below 8 and FCF yield above 5%.", e:[x("sector","==","Energy"),x("evEbitda","<",8),x("fcfYield",">",5)], a:["net-debt"] },
  { id:"E17", cohort:"experienced", q:"Tech companies buying back shares with ROIC above 18%, FCF yield above 4%, P/E below 25.", e:[x("sector","==","Technology"),x("roic",">",18),x("fcfYield",">",4),x("pe","<",25)], a:["buyback"] },
  { id:"E18", cohort:"experienced", q:"Healthcare names with insider ownership above 5%, revenue growth above 12%, operating margin above 15%.", e:[x("sector","==","Healthcare"),x("revGrowth",">",12),x("operatingMargin",">",15)], a:["insider ownership"] },
  { id:"E19", cohort:"experienced", q:"Financials below 1.2x tangible book with ROE above 12% and earnings yield above 7%.", e:[x("sector","==","Financials"),x("roe",">",12),x("earningsYield",">",7)], a:["tangible book"] },
  { id:"E20", cohort:"experienced", q:"Utilities with dividend coverage above 1.5x, payout ratio below 70%, dividend yield above 4%.", e:[x("sector","==","Utilities"),x("payoutRatio","<",70),x("divYield",">",4)], a:["coverage"] },
  { id:"E21", cohort:"experienced", q:"Consumer companies with free cash flow growth above 15%, ROIC above 15%, debt/equity below 0.7.", e:[x("sector","==","Consumer"),x("roic",">",15),x("debtEquity","<",0.7)], a:["cash flow growth"] },
  { id:"E22", cohort:"experienced", q:"Tech stocks with strong margins, ROIC above 18%, revenue growth above 15% and P/E below 28.", e:[x("sector","==","Technology"),x("roic",">",18),x("revGrowth",">",15),x("pe","<",28)], a:["strong margins"] },
  { id:"E23", cohort:"experienced", q:"Financials with a strong balance sheet, P/B below 2, dividend yield above 3% and ROE above 12%.", e:[x("sector","==","Financials"),x("pb","<",2),x("divYield",">",3),x("roe",">",12)], a:["strong balance sheet"] },
  { id:"E24", cohort:"experienced", q:"Quality compounders with ROIC above 18%, gross margin above 40%, 3Y revenue CAGR above 10% and FCF yield above 3%.", e:[x("roic",">",18),x("grossMargin",">",40),x("revGrowth3Y",">",10),x("fcfYield",">",3)], a:["quality"] },
  { id:"E25", cohort:"experienced", q:"Dividend stocks yielding above 3% with low beta and payout ratio below 65%.", e:[x("divYield",">",3),x("payoutRatio","<",65)], a:["low beta"] },
];

const key = (v: E | { field:string; op:string; value:FilterValue }) => `${v instanceof Array ? v[0] : v.field}|${v instanceof Array ? v[1] : v.op}|${String(v instanceof Array ? v[2] : v.value).toLowerCase()}`;

async function main() {
  let pass=0, partial=0, fail=0;
  const cohort = { everyday:{pass:0,partial:0,fail:0}, experienced:{pass:0,partial:0,fail:0} };
  for (const c of cases) {
    const r = await parseQuery(c.q, [], [], "marketCap", "new");
    const actual = new Set(r.filters.map(key));
    const expected = new Set(c.e.map(key));
    const missing = [...expected].filter(k => !actual.has(k));
    const extra = [...actual].filter(k => !expected.has(k));
    const assumptions = r.assumptions.join(" | ").toLowerCase();
    const missingA = (c.a ?? []).filter(n => !assumptions.includes(n.toLowerCase()));
    const matched = c.e.length - missing.length;
    const status = missing.length===0 && extra.length===0 && missingA.length===0 ? "PASS" : matched>0 ? "PARTIAL" : "FAIL";
    if(status==="PASS") { pass++; cohort[c.cohort].pass++; }
    else if(status==="PARTIAL") { partial++; cohort[c.cohort].partial++; }
    else { fail++; cohort[c.cohort].fail++; }
    console.log(`${c.id} ${status}: ${c.q}`);
    if(status!=="PASS") {
      console.log(`  missing=${missing.join(", ") || "none"}`);
      console.log(`  extra=${extra.join(", ") || "none"}`);
      console.log(`  missingAssumptions=${missingA.join(", ") || "none"}`);
      if(r.assumptions.length) console.log(`  assumptions=${r.assumptions.join(" | ")}`);
    }
  }
  console.log(`\nRELEASE BLIND 50 V2: PASS ${pass}/50 | PARTIAL ${partial}/50 | FAIL ${fail}/50`);
  console.log(`everyday: ${cohort.everyday.pass}/25 exact; experienced: ${cohort.experienced.pass}/25 exact`);
  if(partial || fail) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
