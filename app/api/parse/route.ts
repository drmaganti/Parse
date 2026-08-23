import { parseQuery, type ParseMode } from "../../../lib/parse";
import { parseWithCriterionLedgerHardened } from "../../../lib/criterion-ledger-hardened";
import { cookies } from "next/headers";
import { GUEST_RUN_COOKIE, GUEST_RUN_LIMIT, normalizeGuestRuns } from "../../../lib/guest-runs";

// POST /api/parse
// body: { query: string, filters?: Filter[], ranking?: string, mode?: "new" | "refine" }
// Runs server-side so the model key never reaches the browser.

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return Response.json({ error: "Describe the screen you want." }, { status: 400 });
  if (body?.guest === true && normalizeGuestRuns(cookies().get(GUEST_RUN_COOKIE)?.value) >= GUEST_RUN_LIMIT) {
    return Response.json({ error: "You’ve used all three guest screens. Create an account to continue." }, { status: 429 });
  }

  const filters = Array.isArray(body?.filters) ? body.filters : [];
  const lockedIds = Array.isArray(body?.lockedIds) ? body.lockedIds : [];
  const ranking = typeof body?.ranking === "string" ? body.ranking : "marketCap";
  const mode: ParseMode | undefined = body?.mode === "refine" || body?.mode === "new" ? body.mode : undefined;

  try {
    const result = mode === "new"
      ? await parseWithCriterionLedgerHardened(query)
      : await parseQuery(query, filters, lockedIds, ranking, mode);
    return Response.json(result);
  } catch (error) {
    console.error("parse failed", error);
    return Response.json({ error: "Parse could not safely interpret this request." }, { status: 502 });
  }
}
