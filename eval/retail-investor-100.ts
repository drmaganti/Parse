import fs from "node:fs";
import path from "node:path";
import { parseQuery } from "../lib/parse";
import type { Filter } from "../lib/fields";

type Expected = { field: string; op: Filter["op"]; value: number | string };
type TestCase = {
  id: string;
  query: string;
  filters: Expected[];
  category: string;
  assumptionNeedles?: string[];
  minAssumptions?: number;
};

type Dataset = { cases: TestCase[] };

function key(f: Expected | Filter): string {
  return `${f.field}|${f.op}|${String(f.value)}`;
}

function multiset(items: Array<Expected | Filter>): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) out.set(key(item), (out.get(key(item)) ?? 0) + 1);
  return out;
}

function diff(expected: Expected[], actual: Filter[]) {
  const e = multiset(expected);
  const a = multiset(actual);
  const missing: string[] = [];
  const unexpected: string[] = [];
  for (const [k, count] of e) {
    const delta = count - (a.get(k) ?? 0);
    for (let i = 0; i < Math.max(0, delta); i++) missing.push(k);
  }
  for (const [k, count] of a) {
    const delta = count - (e.get(k) ?? 0);
    for (let i = 0; i < Math.max(0, delta); i++) unexpected.push(k);
  }
  return { missing, unexpected };
}

async function run() {
  const file = path.join(process.cwd(), "eval", "retail-investor-100.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Dataset;
  const category = new Map<string, { passed: number; total: number }>();
  const failures: Array<{ c: TestCase; missing: string[]; unexpected: string[]; assumptionFailures: string[]; actual: Filter[]; assumptions: string[] }> = [];
  let expectedSignals = 0;
  let matchedSignals = 0;
  let unexpectedSignals = 0;

  for (const c of data.cases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const { missing, unexpected } = diff(c.filters, result.filters);
    expectedSignals += c.filters.length;
    matchedSignals += c.filters.length - missing.length;
    unexpectedSignals += unexpected.length;

    const assumptionText = result.assumptions.join(" ").toLowerCase();
    const assumptionFailures: string[] = [];
    for (const needle of c.assumptionNeedles ?? []) {
      if (!assumptionText.includes(needle.toLowerCase())) assumptionFailures.push(`missing assumption '${needle}'`);
    }
    if (c.minAssumptions != null && result.assumptions.length < c.minAssumptions) {
      assumptionFailures.push(`expected at least ${c.minAssumptions} assumptions, got ${result.assumptions.length}`);
    }

    const passed = missing.length === 0 && unexpected.length === 0 && assumptionFailures.length === 0;
    const cat = category.get(c.category) ?? { passed: 0, total: 0 };
    cat.total++;
    if (passed) cat.passed++;
    category.set(c.category, cat);

    if (!passed) failures.push({ c, missing, unexpected, assumptionFailures, actual: result.filters, assumptions: result.assumptions });
  }

  const passed = data.cases.length - failures.length;
  console.log(`Retail-investor-100: ${passed}/${data.cases.length} exact statements passed (${(passed / data.cases.length * 100).toFixed(1)}%).`);
  console.log(`Signals: ${matchedSignals}/${expectedSignals} expected matched (${(matchedSignals / expectedSignals * 100).toFixed(1)}%); ${unexpectedSignals} unexpected.`);
  console.log("CATEGORY RESULTS");
  for (const [name, stats] of category) console.log(`${name.padEnd(18)} ${stats.passed}/${stats.total}`);

  console.log("PASSED CASES");
  const failedIds = new Set(failures.map((f) => f.c.id));
  for (const c of data.cases) if (!failedIds.has(c.id)) console.log(`PASS ${c.id} | ${c.query}`);

  if (failures.length) {
    console.log("FAILED CASES");
    for (const f of failures) {
      console.log(`FAIL ${f.c.id} | ${f.c.query}`);
      if (f.missing.length) console.log(`  missing: ${f.missing.join(", ")}`);
      if (f.unexpected.length) console.log(`  unexpected: ${f.unexpected.join(", ")}`);
      for (const a of f.assumptionFailures) console.log(`  ${a}`);
      console.log(`  actual: ${f.actual.map(key).join(", ") || "(none)"}`);
      if (f.assumptions.length) console.log(`  assumptions: ${f.assumptions.join(" | ")}`);
    }
  }

  if (process.env.RETAIL100_STRICT === "1" && failures.length) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
