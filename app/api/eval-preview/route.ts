import baseCases from "../../../eval/cases.json";
import adversarialCases from "../../../eval/adversarial-cases.json";
import { parseQuery } from "../../../lib/parse";
import { evaluateCase, hydrate, type EvalCase } from "../../../eval/harness";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (process.env.VERCEL_ENV !== "preview") return new Response("Not found", { status: 404 });

  const url = new URL(req.url);
  const start = Math.max(0, Number(url.searchParams.get("start") || 0));
  const count = Math.min(5, Math.max(1, Number(url.searchParams.get("count") || 5)));
  const all = [...(baseCases.cases as EvalCase[]), ...(adversarialCases.cases as EvalCase[])];
  const selected = all.slice(start, start + count);
  const rows = [];

  for (const c of selected) {
    const previous = hydrate(c.previous);
    const ranking = c.currentRanking ?? "marketCap";
    const mode = c.mode ?? (previous.length ? "refine" : "new");
    const result = await parseQuery(c.query, mode === "refine" ? previous : [], [], ranking, mode);
    const verdict = evaluateCase(c, result, true);
    rows.push({ query: c.query, critical: !!c.critical, ok: verdict.ok, reasons: verdict.reasons, source: result.source, filters: result.filters.map(({ field, op, value }) => ({ field, op, value })), ranking: result.ranking, assumptions: result.assumptions });
  }

  return Response.json({ start, count: selected.length, total: all.length, passed: rows.filter((r) => r.ok).length, rows });
}
