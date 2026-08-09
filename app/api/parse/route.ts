import { parseQuery } from "../../../lib/parse";

// POST /api/parse
// body: { query: string, filters?: Filter[], lockedIds?: string[] }
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

  const filters = Array.isArray(body?.filters) ? body.filters : [];
  const lockedIds = Array.isArray(body?.lockedIds) ? body.lockedIds : [];

  const result = await parseQuery(query, filters, lockedIds);
  return Response.json(result);
}
