import { cookies } from "next/headers";
import { GUEST_RUN_COOKIE, GUEST_RUN_LIMIT, normalizeGuestRuns } from "../../../lib/guest-runs";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ runs: normalizeGuestRuns(cookies().get(GUEST_RUN_COOKIE)?.value), limit: GUEST_RUN_LIMIT });
}

export async function POST() {
  const runs = normalizeGuestRuns(cookies().get(GUEST_RUN_COOKIE)?.value);
  if (runs >= GUEST_RUN_LIMIT) {
    return Response.json({ error: "Guest screen limit reached.", runs, limit: GUEST_RUN_LIMIT }, { status: 429 });
  }

  const nextRuns = runs + 1;
  cookies().set(GUEST_RUN_COOKIE, String(nextRuns), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return Response.json({ runs: nextRuns, limit: GUEST_RUN_LIMIT });
}
