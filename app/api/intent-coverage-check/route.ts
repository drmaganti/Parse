import { parseQuery } from "../../../../lib/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const moneyflock = await parseQuery(
    "profitable tech companies growing revenue over 20% with low debt and a reasonable valuation",
    [],
    [],
    "marketCap",
    "new"
  );

  const explicit = await parseQuery(
    "Technology companies with operating margin above 0%, revenue growth over 20%, debt/equity below 1, and P/E below 25",
    [],
    [],
    "marketCap",
    "new"
  );

  return Response.json({ moneyflock, explicit });
}
