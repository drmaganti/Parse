import { parseQuery } from "../lib/parse";
import { mapSector } from "../lib/finnhub";
import type { Filter } from "../lib/fields";

interface ExpectedFilter { field: string; op: Filter["op"]; value: number | string }

function hasFilter(filters: Filter[], expected: ExpectedFilter): boolean {
  return filters.some((f) => f.field === expected.field && f.op === expected.op && f.value === expected.value);
}

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS  ${name}`);
  else {
    failed++;
    console.error(`FAIL  ${name}${detail ? ` · ${detail}` : ""}`);
  }
}

async function parserCase(
  query: string,
  expected: ExpectedFilter[],
  ranking?: string,
  requireAssumption = false
) {
  const result = await parseQuery(query, [], [], "marketCap", "new");
  check(`${query} uses deterministic rules`, result.source === "rules", `source=${result.source}`);
  for (const f of expected) check(`${query} → ${f.field}${f.op}${f.value}`, hasFilter(result.filters, f), JSON.stringify(result.filters));
  check(`${query} has no unexpected filters`, result.filters.length === expected.length, JSON.stringify(result.filters));
  if (ranking) check(`${query} ranking=${ranking}`, result.ranking === ranking, `ranking=${result.ranking}`);
  if (requireAssumption) check(`${query} exposes assumption`, result.assumptions.length > 0, JSON.stringify(result.assumptions));
}

async function intentCoverageCase(
  query: string,
  expected: ExpectedFilter[],
  assumptionNeedles: string[]
) {
  const result = await parseQuery(query, [], [], "marketCap", "new");
  check(`${query} uses deterministic rules`, result.source === "rules", `source=${result.source}`);
  for (const f of expected) check(`${query} → ${f.field}${f.op}${f.value}`, hasFilter(result.filters, f), JSON.stringify(result.filters));
  check(`${query} has no unexpected filters`, result.filters.length === expected.length, JSON.stringify(result.filters));
  const assumptions = result.assumptions.join(" ").toLowerCase();
  for (const needle of assumptionNeedles) {
    check(`${query} surfaces unmapped '${needle}' intent`, assumptions.includes(needle.toLowerCase()), JSON.stringify(result.assumptions));
  }
}

async function run() {
  await parserCase(
    "Large companies that are not tech but are cheap. Not dead cheap though.",
    [
      { field: "pe", op: ">=", value: 10 },
      { field: "pe", op: "<=", value: 20 },
      { field: "pb", op: "<", value: 4 },
      { field: "marketCap", op: ">", value: 50 },
      { field: "sector", op: "!=", value: "Technology" },
    ],
    "value",
    true
  );

  await parserCase(
    "Large non-tech companies with low P/E",
    [
      { field: "pe", op: "<", value: 20 },
      { field: "marketCap", op: ">", value: 50 },
      { field: "sector", op: "!=", value: "Technology" },
    ]
  );

  await parserCase(
    "Healthcare companies that are not tech",
    [
      { field: "sector", op: "==", value: "Healthcare" },
      { field: "sector", op: "!=", value: "Technology" },
    ]
  );

  await parserCase(
    "Cheap companies but not too cheap",
    [
      { field: "pe", op: ">=", value: 10 },
      { field: "pe", op: "<=", value: 20 },
      { field: "pb", op: "<", value: 4 },
    ],
    "value",
    true
  );

  await intentCoverageCase(
    "profitable tech companies growing revenue over 20% with low debt and a reasonable valuation",
    [
      { field: "revGrowth", op: ">", value: 20 },
      { field: "sector", op: "==", value: "Technology" },
    ],
    ["profitable", "low debt", "reasonable valuation"]
  );

  const explicit = await parseQuery(
    "Technology companies with operating margin above 0%, revenue growth over 20%, debt/equity below 1, and P/E below 25",
    [],
    [],
    "marketCap",
    "new"
  );
  const explicitFilters: ExpectedFilter[] = [
    { field: "operatingMargin", op: ">", value: 0 },
    { field: "revGrowth", op: ">", value: 20 },
    { field: "debtEquity", op: "<", value: 1 },
    { field: "pe", op: "<", value: 25 },
    { field: "sector", op: "==", value: "Technology" },
  ];
  for (const f of explicitFilters) check(`explicit thresholds → ${f.field}${f.op}${f.value}`, hasFilter(explicit.filters, f), JSON.stringify(explicit.filters));
  check("explicit thresholds have no unexpected filters", explicit.filters.length === explicitFilters.length, JSON.stringify(explicit.filters));
  check("explicit thresholds do not trigger unmapped-intent warnings", !explicit.assumptions.some((a) => /left out rather than guess|criterion was left out/i.test(a)), JSON.stringify(explicit.assumptions));

  const sectors: Array<[string, string | null]> = [
    ["Biotechnology", "Healthcare"],
    ["Biotechnology & Medical Research", "Healthcare"],
    ["Pharmaceuticals", "Healthcare"],
    ["Health Care Equipment", "Healthcare"],
    ["Medical Devices", "Healthcare"],
    ["Technology", "Technology"],
    ["Software", "Technology"],
    ["Semiconductors", "Technology"],
    ["Information Technology Services", "Technology"],
    ["Financial Technology", "Financials"],
  ];
  for (const [industry, expected] of sectors) {
    check(`mapSector(${industry})`, mapSector(industry) === expected, `got=${mapSector(industry)}`);
  }

  if (failed) {
    console.error(`\n${failed} composite regression assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nComposite intent + sector regressions passed");
}

run().catch((e) => { console.error(e); process.exit(1); });
