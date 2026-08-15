import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseQuery } from "../lib/parse";
import { fallbackParse } from "../lib/fallback-parse";
import { evaluateCase, hydrate, type EvalCase } from "./harness";

const __dir = dirname(fileURLToPath(import.meta.url));
const OFFLINE = process.env.OFFLINE === "1";
const MODEL_RUNS = Math.max(1, Number(process.env.MODEL_RUNS || 1));
const MODEL_MIN_PASS_RATE = Number(process.env.MODEL_MIN_PASS_RATE || 0.95);

function load(name: string): EvalCase[] {
  const raw = JSON.parse(readFileSync(join(__dir, name), "utf8"));
  return raw.cases || [];
}

async function run() {
  const allCases = [...load("cases.json"), ...load("adversarial-cases.json"), ...load("release-regressions.json")];
  const cases = OFFLINE ? allCases.filter((c) => !c.modelOnly) : allCases;
  const provider = OFFLINE ? "rules (offline)" : (process.env.LLM_PROVIDER ?? "groq");
  const repeats = OFFLINE ? 1 : MODEL_RUNS;
  const report: any = { provider, offline: OFFLINE, repeats, cases: cases.length, runs: [] };

  console.log(`\nParse eval · ${cases.length}/${allCases.length} cases · ${provider} · ${repeats} run(s)\n`);

  let overallPasses = 0;
  let overallAttempts = 0;
  let criticalFailures = 0;
  const sources: Record<string, number> = {};

  for (let runIndex = 0; runIndex < repeats; runIndex++) {
    let pass = 0;
    const runRows: any[] = [];
    if (repeats > 1) console.log(`--- run ${runIndex + 1}/${repeats} ---`);

    for (const c of cases) {
      const previous = hydrate(c.previous);
      const ranking = c.currentRanking ?? "marketCap";
      const mode = c.mode ?? (previous.length ? "refine" : "new");
      const result = OFFLINE
        ? { ...fallbackParse(c.query, mode === "refine" ? previous : [], [], ranking, mode === "refine"), source: "rules" as const }
        : await parseQuery(c.query, mode === "refine" ? previous : [], [], ranking, mode);

      sources[result.source] = (sources[result.source] || 0) + 1;
      const verdict = evaluateCase(c, result, false);
      if (verdict.ok) pass++;
      else if (c.critical) criticalFailures++;

      overallAttempts++;
      if (verdict.ok) overallPasses++;
      runRows.push({ query: c.query, ok: verdict.ok, critical: !!c.critical, source: result.source, reasons: verdict.reasons, filters: result.filters, ranking: result.ranking, assumptions: result.assumptions });

      console.log(`${verdict.ok ? "PASS" : "FAIL"}${c.critical ? "*" : " "} ${c.query}`);
      console.log(`      → [${verdict.chips}] rank=${result.ranking} src=${result.source}`);
      if (!verdict.ok) console.log(`      ✗ ${verdict.reasons.join("; ")}`);
    }

    const pct = cases.length ? pass / cases.length : 0;
    console.log(`\nrun ${runIndex + 1}: ${pass}/${cases.length} passed (${(pct * 100).toFixed(1)}%)\n`);
    report.runs.push({ run: runIndex + 1, passed: pass, total: cases.length, passRate: pct, rows: runRows });
  }

  const passRate = overallAttempts ? overallPasses / overallAttempts : 0;
  report.summary = { passed: overallPasses, attempts: overallAttempts, passRate, criticalFailures, sources };
  if (process.env.EVAL_REPORT) writeFileSync(process.env.EVAL_REPORT, JSON.stringify(report, null, 2));

  console.log(`overall: ${overallPasses}/${overallAttempts} passed (${(passRate * 100).toFixed(1)}%)`);
  console.log(`critical failures: ${criticalFailures}; sources: ${JSON.stringify(sources)}`);
  console.log("");

  if (OFFLINE) {
    if (overallPasses !== overallAttempts) process.exitCode = 1;
  } else if (passRate < MODEL_MIN_PASS_RATE || criticalFailures > 0) {
    process.exitCode = 1;
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
