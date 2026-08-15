import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateCase, hydrate, type EvalCase } from "./harness";

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.EVAL_BASE_URL || "").replace(/\/$/, "");
const RUNS = Math.max(1, Number(process.env.MODEL_RUNS || 1));
const MIN_PASS_RATE = Number(process.env.MODEL_MIN_PASS_RATE || 0.95);

if (!BASE_URL) {
  console.error("Set EVAL_BASE_URL, for example https://getparse.app");
  process.exit(2);
}

function load(name: string): EvalCase[] {
  return JSON.parse(readFileSync(join(__dir, name), "utf8")).cases || [];
}

async function parseRemote(c: EvalCase) {
  const previous = hydrate(c.previous);
  const ranking = c.currentRanking ?? "marketCap";
  const mode = c.mode ?? (previous.length ? "refine" : "new");
  const res = await fetch(`${BASE_URL}/api/parse`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "parse-p0-eval/1.0" },
    body: JSON.stringify({ query: c.query, filters: mode === "refine" ? previous : [], ranking, mode }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return await res.json();
}

async function main() {
  const cases = [...load("cases.json"), ...load("adversarial-cases.json")];
  let attempts = 0;
  let passes = 0;
  let criticalFailures = 0;
  let fallbacks = 0;
  const failures: any[] = [];

  console.log(`\nLive Parse eval · ${cases.length} cases · ${BASE_URL} · ${RUNS} run(s)\n`);

  for (let run = 1; run <= RUNS; run++) {
    let runPass = 0;
    for (const c of cases) {
      let result: any;
      try {
        result = await parseRemote(c);
      } catch (error: any) {
        attempts++;
        if (c.critical) criticalFailures++;
        failures.push({ run, query: c.query, critical: !!c.critical, reasons: [`request failed: ${error?.message || error}`] });
        console.log(`FAIL${c.critical ? "*" : " "} ${c.query} → request failed`);
        continue;
      }

      const verdict = evaluateCase(c, result, true);
      attempts++;
      if (result.source !== "model") fallbacks++;
      if (verdict.ok) { passes++; runPass++; }
      else {
        if (c.critical) criticalFailures++;
        failures.push({ run, query: c.query, critical: !!c.critical, source: result.source, reasons: verdict.reasons, filters: result.filters, ranking: result.ranking, assumptions: result.assumptions });
      }
      console.log(`${verdict.ok ? "PASS" : "FAIL"}${c.critical ? "*" : " "} ${c.query} → [${verdict.chips}] rank=${result.ranking} src=${result.source}`);
    }
    console.log(`run ${run}: ${runPass}/${cases.length}\n`);
  }

  const passRate = attempts ? passes / attempts : 0;
  console.log(`live model: ${passes}/${attempts} (${(passRate * 100).toFixed(1)}%)`);
  console.log(`critical failures: ${criticalFailures}`);
  console.log(`fallbacks: ${fallbacks}`);
  if (failures.length) console.log(`\nFailures:\n${JSON.stringify(failures, null, 2)}`);

  if (passRate < MIN_PASS_RATE || criticalFailures > 0 || fallbacks > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
