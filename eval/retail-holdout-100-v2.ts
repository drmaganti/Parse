import fs from "node:fs";
import path from "node:path";
import { parseQuery } from "../lib/parse";

type Case = { id: string; query: string };
type Dataset = { cases: Case[] };

function filterKey(f: any): string {
  return `${f.field}${f.op}${String(f.value)}`;
}

async function run() {
  const file = path.join(process.cwd(), "eval", "retail-holdout-100-v2.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Dataset;
  console.log(`HOLDOUT100_START count=${data.cases.length}`);
  for (const c of data.cases) {
    const result = await parseQuery(c.query, [], [], "marketCap", "new");
    const filters = result.filters.map(filterKey).join(";") || "(none)";
    const assumptions = result.assumptions.join(" || ").replace(/\n/g, " ") || "(none)";
    console.log(`${c.id}|${c.query}|FILTERS=${filters}|ASSUMPTIONS=${assumptions}|SOURCE=${result.source}`);
  }
  console.log("HOLDOUT100_END");
}

run().catch((err) => { console.error(err); process.exit(1); });
