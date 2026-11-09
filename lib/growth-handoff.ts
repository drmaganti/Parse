import { decodeScreenState } from "./screen-state";

// Only the default-universe screen can be restored faithfully in the
// authenticated screener today. Reject oversized or malformed links.
export function validatedGuestScreenState(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 6000) return null;
  const state = decodeScreenState(raw);
  if (!state || !state.q.trim() || state.q.length > 320 || state.filters.length > 30 || state.universe) return null;
  return raw;
}

export function signupHandoffHref(raw: string | null | undefined): string {
  const state = validatedGuestScreenState(raw);
  return state ? `/account?mode=signup&state=${encodeURIComponent(state)}` : "/account?mode=signup";
}

export function authenticatedHandoffHref(raw: string | null | undefined): string {
  const state = validatedGuestScreenState(raw);
  return state ? `/app?state=${encodeURIComponent(state)}&source=signup_handoff` : "/app";
}

export const PENDING_SCREEN_STORAGE_KEY = "parse_pending_signup_screen";
export const PENDING_SCREEN_TTL_MS = 24 * 60 * 60 * 1000;

export function encodePendingScreenRecord(raw: string | null, nowMs = Date.now()): string | null {
  const state = validatedGuestScreenState(raw);
  return state ? JSON.stringify({ state, expiresAt: nowMs + PENDING_SCREEN_TTL_MS }) : null;
}

export function decodePendingScreenRecord(raw: string | null, nowMs = Date.now()): string | null {
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw);
    if (!payload || typeof payload.expiresAt !== "number" || payload.expiresAt <= nowMs) return null;
    return validatedGuestScreenState(payload.state);
  } catch {
    return null;
  }
}
