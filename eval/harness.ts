import type { Filter, Op } from "../lib/fields";
import type { ParseMode, ParseResult } from "../lib/parse";

export interface ExpectedFilter { field: string; op: string; value: number | string; tolerance?: number; }
export interface RawFilter extends ExpectedFilter { source?: Filter["source"]; }
export interface EvalCase {
  query: string;
  mode?: ParseMode;
  previous?: RawFilter[];
  currentRanking?: string;
  expect: { filters?: ExpectedFilter[]; ranking?: string; filterCount?: number };
  reject?: { field: string; op?: string; value?: number | string }[];
  requireAssumptions?: boolean;
  modelOnly?: boolean;
  critical?: boolean;
  exactFilters?: boolean;
}

export interface CaseResult {
  ok: boolean;
  reasons: string[];
  chips: string;
}

export function hydrate(raw: RawFilter[] = []): Filter[] {
  return raw.map((f, i) => ({ id: `eval_${i}_${f.field}`, field: f.field, op: f.op as Op, value: f.value, source: f.source ?? "ai" }));
}

function matchFilter(exp: ExpectedFilter, got: Filter[]): boolean {
  return got.some((g) => {
    if (g.field !== exp.field || g.op !== exp.op) return false;
    if (typeof exp.value !== "number") return String(g.value).toLowerCase() === String(exp.value).toLowerCase();
    const actual = Number(g.value);
    if (!Number.isFinite(actual)) return false;
    const tolerance = exp.tolerance ?? 0;
    return Math.abs(actual - exp.value) <= tolerance;
  });
}

function rejected(rule: { field: string; op?: string; value?: number | string }, got: Filter[]): boolean {
  return got.some((g) => g.field === rule.field && (!rule.op || g.op === rule.op) && (rule.value === undefined || String(g.value).toLowerCase() === String(rule.value).toLowerCase()));
}

export function evaluateCase(c: EvalCase, result: ParseResult | (Omit<ParseResult, "source"> & { source?: string }), requireModel = false): CaseResult {
  const reasons: string[] = [];
  const expected = c.expect.filters ?? [];

  for (const ef of expected) if (!matchFilter(ef, result.filters)) reasons.push(`missing ${ef.field}${ef.op}${ef.value}`);
  for (const reject of c.reject ?? []) if (rejected(reject, result.filters)) reasons.push(`unexpected ${reject.field}${reject.op ?? ""}${reject.value ?? ""}`);
  if (c.expect.filterCount !== undefined && result.filters.length !== c.expect.filterCount) reasons.push(`filter count ${result.filters.length}≠${c.expect.filterCount}`);
  if (c.exactFilters && result.filters.length !== expected.length) reasons.push(`extra filters: expected ${expected.length}, got ${result.filters.length}`);
  if (c.expect.ranking && result.ranking !== c.expect.ranking) reasons.push(`ranking ${result.ranking}≠${c.expect.ranking}`);
  if (c.requireAssumptions && result.assumptions.length === 0) reasons.push("no assumption recorded");
  if (requireModel && result.source !== "model") reasons.push(`source ${result.source ?? "unknown"}≠model`);

  return {
    ok: reasons.length === 0,
    reasons,
    chips: result.filters.map((f) => `${f.field}${f.op}${f.value}`).join(" "),
  };
}
