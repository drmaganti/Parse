import { parseQuery } from "../lib/parse";
import { applyCoverageAudit, type CoverageAudit, type CoverageScreen } from "../lib/coverage-reconcile";
import type { Filter, FilterValue, Op } from "../lib/fields";

type Expected = { field: string; op: Op; value: FilterValue };
type BlindCase = { id: string; query: string; expected: Expected[] };
const f = (field: string, op: Op, value: FilterValue): Expected => ({ field, op, value });

const blindCases: BlindCase[] = [
  { id: "B02", query: "Healthcare stocks in the black with revenue up more than 12%, little debt, and not too pricey.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">", 12), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Healthcare")] },
  { id: "B04", query: "Show me profitable energy companies with double-digit sales growth, modest debt, reasonably valued.", expected: [f("operatingMargin", ">", 0), f("revGrowth", ">=", 10), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Energy")] },
  { id: "B14", query: "High-ROIC semiconductor names growing revenue above 15% with modest debt and fair valuation.", expected: [f("roic", ">", 15), f("revGrowth", ">", 15), f("debtEquity", "<", 1), f("pe", "<", 25), f("sector", "==", "Technology")] },
  { id: "E01", query: "Large-cap semiconductors with forward P/E below 28, PEG under 1.8, gross margin above 45%, and 3-year revenue CAGR over 12%.", expected: [f("marketCap", ">", 50), f("forwardPe", "<", 28), f("peg", "<", 1.8), f("grossMargin", ">", 45), f("revGrowth3Y", ">", 12), f("sector", "==", "Technology")] },
  { id: "E11", query: "Large healthcare companies with gross margin above 50%, ROE above 20%, 3Y revenue CAGR above 10%, debt/equity below 0.5.", expected: [f("marketCap", ">", 50), f("grossMargin", ">", 50), f("roe", ">", 20), f("revGrowth3Y", ">", 10), f("debtEquity", "<", 0.5), f("sector", "==", "Healthcare")] },
  { id: "E15", query: "Semis with forward PEG below 1.3, 3-year EPS CAGR above 15%, gross margin over 50%, and P/S below 8.", expected: [f("forwardPeg", "<", 1.3), f("epsGrowth3Y", ">", 15), f("grossMargin", ">", 50), f("ps", "<", 8), f("sector", "==", "Technology")] },
];

function key(x: Pick<Filter, "field" | "op" | "value"> | Expected): string { return `${x.field}|${x.op}|${String(x.value).toLowerCase()}`; }
function baseScreen(filters: Filter[] = []): CoverageScreen { return { filters, ranking: "marketCap", interpretation: "test", assumptions: [] }; }
function filter(field: string, op: Op, value: FilterValue): Filter { return { id: `${field}_${op}_${String(value)}`, field, op, value, source: "ai" }; }

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`PASS ${name}`);
  else { failures++; console.log(`FAIL ${name}${detail ? ` | ${detail}` : ""}`); }
}

async function runBlindGaps() {
  for (const c of blindCases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const actual = new Set(result.filters.map(key));
    const expected = new Set(c.expected.map(key));
    const missing = [...expected].filter((x) => !actual.has(x));
    const extra = [...actual].filter((x) => !expected.has(x));
    check(`${c.id} frozen blind partial is now exact`, missing.length === 0 && extra.length === 0, `missing=${missing.join(",")} extra=${extra.join(",")}`);
  }
}

function runCoverageContract() {
  const explicitAudit: CoverageAudit = { recoveries: [{ phrase: "revenue climbing above 17%", basis: "explicit", action: "add", field: "revGrowth", op: ">", value: 17 }], unresolved: [] };
  const explicit = applyCoverageAudit("Tech stocks with revenue climbing above 17%", baseScreen([filter("sector", "==", "Technology")]), explicitAudit, false);
  check("coverage recovery accepts an explicit grounded threshold", explicit.filters.some((x) => key(x) === "revGrowth|>|17"));

  const defaultAudit: CoverageAudit = { recoveries: [{ phrase: "profitable", basis: "parse_default", concept: "profitable", action: "add", field: "operatingMargin", op: ">", value: 0 }], unresolved: [] };
  const withDefault = applyCoverageAudit("profitable tech stocks", baseScreen([filter("sector", "==", "Technology")]), defaultAudit, false);
  check("coverage recovery allows documented defaults", withDefault.filters.some((x) => key(x) === "operatingMargin|>|0"));

  const inventedAudit: CoverageAudit = { recoveries: [{ phrase: "strong margins", basis: "explicit", action: "add", field: "operatingMargin", op: ">", value: 20 }], unresolved: [] };
  const invented = applyCoverageAudit("Tech stocks with strong margins", baseScreen([filter("sector", "==", "Technology")]), inventedAudit, false);
  check("coverage recovery rejects invented thresholds", !invented.filters.some((x) => x.field === "operatingMargin"));
  check("rejected recovery is surfaced", invented.assumptions.some((x) => /Couldn’t confidently translate.*strong margins/i.test(x)));

  const unresolvedAudit: CoverageAudit = { recoveries: [], unresolved: [{ phrase: "strong balance sheet", reason: "That phrase can refer to several balance-sheet measures.", suggestedFields: ["debtEquity", "currentRatio", "quickRatio", "interestCoverage"] }] };
  const unresolved = applyCoverageAudit("Companies with a strong balance sheet", baseScreen(), unresolvedAudit, false);
  check("unresolved criteria are explicitly raised", unresolved.assumptions.some((x) => /Couldn’t confidently translate.*strong balance sheet/i.test(x)));
  check("unresolved criteria can suggest indicators", unresolved.assumptions.some((x) => /Possible indicators:.*Debt \/ equity.*Current ratio/i.test(x)));

  const conflictAudit: CoverageAudit = { recoveries: [{ phrase: "P/E above 30", basis: "explicit", action: "add", field: "pe", op: ">", value: 30 }], unresolved: [] };
  const conflict = applyCoverageAudit("P/E below 20 but P/E above 30", baseScreen([filter("pe", "<", 20)]), conflictAudit, false);
  check("coverage recovery cannot introduce conflict", !conflict.filters.some((x) => key(x) === "pe|>|30"));
  check("conflicting recovery is surfaced", conflict.assumptions.some((x) => /Couldn’t confidently translate.*P\/E above 30/i.test(x)));
}

async function run() {
  await runBlindGaps();
  runCoverageContract();
  if (failures) process.exit(1);
  console.log(`${blindCases.length} blind-gap cases + coverage reconciliation contract passed`);
}

run().catch((err) => { console.error(err); process.exit(1); });
