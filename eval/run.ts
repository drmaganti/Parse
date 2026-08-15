import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseQuery, type ParseMode } from "../lib/parse";
import { fallbackParse } from "../lib/fallback-parse";
import type { Filter, Op } from "../lib/fields";

const __dir = dirname(fileURLToPath(import.meta.url));
const OFFLINE = process.env.OFFLINE === "1";

interface ExpectedFilter { field: string; op: string; value: number | string; }
interface RawFilter extends ExpectedFilter { source?: Filter["source"]; }
interface Case {
  query: string;
  mode?: ParseMode;
  previous?: RawFilter[];
  currentRanking?: string;
  expect: { filters?: ExpectedFilter[]; ranking?: string; filterCount?: number };
  reject?: { field: string; op?: string; value?: number | string }[];
  requireAssumptions?: boolean;
  modelOnly?: boolean;
}

function hydrate(raw: RawFilter[] = []): Filter[] {
  return raw.map((f, i) => ({ id: `eval_${i}_${f.field}`, field: f.field, op: f.op as Op, value: f.value, source: f.source ?? "ai" }));
}

function matchFilter(exp: ExpectedFilter, got: Filter[]): boolean {
  return got.some((g) => {
    if (g.field !== exp.field || g.op !== exp.op) return false;
    if (typeof exp.value === "number") return Number(g.value) === exp.value || withinReason(exp.op, exp.value, Number(g.value));
    return String(g.value).toLowerCase() === String(exp.value).toLowerCase();
  });
}

function withinReason(op: string, expVal: number, got: number): boolean {
  if (!Number.isFinite(got)) return false;
  const band = Math.max(Math.abs(expVal) * 0.15, 1);
  if (op === ">" || op === ">=") return got >= expVal - band && got <= expVal + band;
  if (op === "<" || op === "<=") return got >= expVal - band && got <= expVal + band;
  return Math.abs(got - expVal) <= band;
}

function rejected(rule: { field: string; op?: string; value?: number | string }, got: Filter[]): boolean {
  return got.some((g) => g.field === rule.field && (!rule.op || g.op === rule.op) && (rule.value === undefined || String(g.value).toLowerCase() === String(rule.value).toLowerCase()));
}

async function run() {
  const raw = JSON.parse(readFileSync(join(__dir, "cases.json"), "utf8"));
  const allCases: Case[] = raw.cases;
  const cases = OFFLINE ? allCases.filter((c) => !c.modelOnly) : allCases;
  const provider = OFFLINE ? "fallback (offline)" : (process.env.LLM_PROVIDER ?? "groq");
  console.log(`\nParse eval · ${cases.length}/${allCases.length} cases · ${provider}\n`);

  let pass = 0;
  for (const c of cases) {
    const previous = hydrate(c.previous);
    const ranking = c.currentRanking ?? "marketCap";
    const mode = c.mode ?? (previous.length ? "refine" : "new");
    const r = OFFLINE
      ? fallbackParse(c.query, mode === "refine" ? previous : [], [], ranking)
      : await parseQuery(c.query, mode === "refine" ? previous : [], [], ranking, mode);
    const reasons: string[] = [];

    for (const ef of c.expect.filters ?? []) if (!matchFilter(ef, r.filters)) reasons.push(`missing ${ef.field}${ef.op}${ef.value}`);
    for (const reject of c.reject ?? []) if (rejected(reject, r.filters)) reasons.push(`unexpected ${reject.field}${reject.op ?? ""}${reject.value ?? ""}`);
    if (c.expect.filterCount !== undefined && r.filters.length !== c.expect.filterCount) reasons.push(`filter count ${r.filters.length}≠${c.expect.filterCount}`);
    if (c.expect.ranking && r.ranking !== c.expect.ranking) reasons.push(`ranking ${r.ranking}≠${c.expect.ranking}`);
    if (c.requireAssumptions && r.assumptions.length === 0) reasons.push("no assumption recorded");

    const ok = reasons.length === 0;
    if (ok) pass++;
    const chips = r.filters.map((f) => `${f.field}${f.op}${f.value}`).join(" ");
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.query}`);
    console.log(`      → [${chips}] rank=${r.ranking}${(r as any).source ? " src=" + (r as any).source : ""}`);
    if (!ok) console.log(`      ✗ ${reasons.join("; ")}`);
  }

  const pct = cases.length ? ((pass / cases.length) * 100).toFixed(0) : "0";
  console.log(`\n${pass}/${cases.length} passed (${pct}%)\n`);
  if (OFFLINE) {
    if (pass !== cases.length) process.exitCode = 1;
  } else if (cases.length && pass / cases.length < 0.9) {
    process.exitCode = 1;
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
