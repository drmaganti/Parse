import { parseWithCriterionLedger } from "../../../lib/criterion-ledger";

// Experimental endpoint for validating the criterion-ledger architecture.
// It does not replace /api/parse and is intentionally limited to new screens.
export const runtime = "nodejs";

async function run(query: string) {
  if (!query) return Response.json({ error: "Describe the screen you want." }, { status: 400 });
  try {
    const result = await parseWithCriterionLedger(query);
    return Response.json(result);
  } catch (error) {
    console.error("parse-v2 failed", error);
    return Response.json({ error: "The experimental parser could not safely interpret this request." }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return run((url.searchParams.get("q") ?? "").trim());
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (body?.mode === "refine") {
    return Response.json({ error: "The criterion-ledger experiment currently validates new screens only." }, { status: 400 });
  }
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  return run(query);
}
