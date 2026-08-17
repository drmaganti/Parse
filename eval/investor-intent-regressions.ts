import { parseQuery } from "../lib/parse";

const cases = [
  {
    name: "double digit EPS without horizon is surfaced",
    query: "Show me companies growing both revenue and EPS double digits with low leverage.",
    mustInclude: [/EPS\/earnings growth needs a time horizon/i, /Low debt\/leverage/i],
  },
  {
    name: "quality style with intervening sector is surfaced",
    query: "Quality tech stocks: high ROIC, strong margins, low leverage, and reasonable valuation.",
    mustInclude: [/Quality.*investment style/i, /High ROIC/i, /Strong margins/i, /Low debt\/leverage/i, /Reasonable valuation/i],
  },
  {
    name: "high quality growth style surfaces both styles",
    query: "Find high-quality growth stocks with strong margins, high ROIC, and not-crazy valuations.",
    mustInclude: [/Quality.*investment style/i, /Growth.*investment style/i, /Strong margins/i, /High ROIC/i, /Reasonable valuation/i],
  },
  {
    name: "explicit 5Y dividend growth suppresses redundant dividend-grower warning",
    query: "Show me dividend growers with 5-year dividend CAGR above 7%, payout ratio below 60%, and yield above 2%.",
    mustInclude: [],
    mustExclude: [/Dividend grower.*needs a growth horizon/i],
  },
  {
    name: "postpositive low leverage wording is surfaced",
    query: "High-yield stocks above 5% where free cash flow covers the dividend and leverage is low.",
    mustInclude: [/Dividend coverage/i, /Low debt\/leverage/i],
  },
];

async function run() {
  let failures = 0;
  for (const c of cases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const text = result.assumptions.join(" | ");
    const missing = c.mustInclude.filter((rx) => !rx.test(text));
    const forbidden = (c.mustExclude ?? []).filter((rx) => rx.test(text));
    if (missing.length || forbidden.length) {
      failures++;
      console.log(`FAIL ${c.name}`);
      if (missing.length) console.log(`  missing: ${missing.map(String).join(", ")}`);
      if (forbidden.length) console.log(`  forbidden: ${forbidden.map(String).join(", ")}`);
      console.log(`  assumptions: ${text || "(none)"}`);
    } else {
      console.log(`PASS ${c.name}`);
    }
  }

  if (failures) process.exit(1);
  console.log(`${cases.length}/${cases.length} investor-intent regressions passed`);
}

run().catch((err) => { console.error(err); process.exit(1); });
