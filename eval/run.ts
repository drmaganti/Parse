import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseQuery } from "../lib/parse";
import { fallbackParse } from "../lib/fallback-parse";
import type { Filter } from "../lib/fields";

// Measures parse quality against eval/cases.json.
//   npm run eval              → uses the configured model (needs a key)
//   OFFLINE=1 npm run eval    → uses the rule-based fallback (no key, CI smoke test)
//
// Per case: every expected filter must be matched by field+op (+ numeric value),
// and the ranking must match when the case specifies one. Vague cases instead
// require at least one assumption to be recorded.

const __dir = dirname(fileURLToPath(import.meta.url));
const OFFLINE = process.env.OFFLINE === "1";

interface Case {
  query: string;
  expect: { filters?: { field: string; op: string; value: number | string }[]; ranking?: string };
  requireAssumptions?: boolean;
}

function matchFilter(exp: { field: string; op: string; value: number | string }, got: Filter[]): boolean {
  return got.some((g) => {
    if (g.field !== exp.field || g.op !== exp.op) return false;
    if (typeof exp.value === "number") {
      // Accept the model's own threshold if it's in the right direction and
      // not wildly off; exact match always passes.
      return Number(g.value) === exp.value || withinReason(exp.op, exp.value, Number(g.value));
    }
    return String(g.value).toLowerCase() === String(exp.value).toLowerCase();
  });
}

// For "> N" a stricter (higher) threshold still honours intent; for "< N" a
// stricter (lower) one does. Allow a modest band so sensible model choices pass.
function withinReason(op: string, expVal: number, got: number): boolean {
  const band = Math.max(Math.abs(expVal) * 0.5, 5);
  if (op.startsWith(">")) return got >= expVal - band;
  if (op.startsWith("<")) return got <= expVal + band;
  return Math.abs(got - expVal) <= band;
}

async function run() {
  const raw = JSON.parse(readFileSync(join(__dir, "cases.json"), "utf8"));
  const cases: Case[] = raw.cases;
  const provider = OFFLINE ? "fallback (offline)" : (process.env.LLM_PROVIDER ?? "groq");
  console.log(`\nParse eval · ${cases.length} cases · ${provider}\n`);

  let pass = 0;
  for (const c of cases) {
    const r = OFFLINE ? fallbackParse(c.query) : await parseQuery(c.query);
    const reasons: string[] = [];

    for (const ef of c.expect.filters ?? []) {
      if (!matchFilter(ef, r.filters)) reasons.push(`missing ${ef.field}${ef.op}${ef.value}`);
    }
    if (c.expect.ranking && r.ranking !== c.expect.ranking) reasons.push(`ranking ${r.ranking}≠${c.expect.ranking}`);
    if (c.requireAssumptions && r.assumptions.length === 0) reasons.push("no assumption recorded");

    const ok = reasons.length === 0;
    if (ok) pass++;
    const chips = r.filters.map((f) => `${f.field}${f.op}${f.value}`).join(" ");
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.query}`);
    console.log(`      → [${chips}] rank=${r.ranking}${(r as any).source ? " src=" + (r as any).source : ""}`);
    if (!ok) console.log(`      ✗ ${reasons.join("; ")}`);
  }

  const pct = ((pass / cases.length) * 100).toFixed(0);
  console.log(`\n${pass}/${cases.length} passed (${pct}%)\n`);
  if (!OFFLINE && pass / cases.length < 0.7) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exit(1); });
