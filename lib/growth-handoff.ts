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
