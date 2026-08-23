export const GUEST_RUN_LIMIT = 3;
export const GUEST_RUN_COOKIE = "parse_guest_runs_v1";

export function normalizeGuestRuns(value: string | undefined) {
  const count = Number.parseInt(value || "0", 10);
  return Number.isFinite(count) ? Math.min(GUEST_RUN_LIMIT, Math.max(0, count)) : 0;
}
