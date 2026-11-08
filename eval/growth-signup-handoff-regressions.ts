import assert from "node:assert/strict";
import { encodeScreenState, decodeScreenState } from "../lib/screen-state";
import { validatedGuestScreenState, signupHandoffHref, authenticatedHandoffHref, encodePendingScreenRecord, decodePendingScreenRecord, PENDING_SCREEN_TTL_MS } from "../lib/growth-handoff";

const sample = {
  q: "Profitable companies with P/E below 15",
  ranking: "marketCap",
  filters: [{ id: "pe_lt_15", field: "pe", op: "<" as const, value: 15, source: "user" as const }],
};
const raw = encodeScreenState(sample);
assert.equal(validatedGuestScreenState(raw), raw);
const signup = new URL(signupHandoffHref(raw), "https://getparse.app");
assert.equal(signup.pathname, "/account");
const fromSignup = signup.searchParams.get("state");
assert.equal(fromSignup, raw);
assert.deepEqual(decodeScreenState(fromSignup)?.filters.map(({ field, op, value }) => ({ field, op, value })),
  [{ field: "pe", op: "<", value: 15 }]);

const afterAuth = new URL(authenticatedHandoffHref(fromSignup), "https://getparse.app");
assert.equal(afterAuth.pathname, "/app");
assert.equal(afterAuth.searchParams.get("source"), "signup_handoff");
assert.equal(afterAuth.searchParams.get("state"), raw);
assert.equal(decodeScreenState(afterAuth.searchParams.get("state"))?.q, sample.q);

const collectionState = encodeScreenState({ ...sample, universe: { type: "collection", slug: "warren-buffett" } });
assert.equal(validatedGuestScreenState(collectionState), null);
assert.equal(signupHandoffHref(collectionState), "/account?mode=signup");
assert.equal(authenticatedHandoffHref(collectionState), "/app");
assert.equal(validatedGuestScreenState(encodeScreenState({ ...sample, q: "x".repeat(321) })), null);
assert.equal(validatedGuestScreenState(encodeScreenState({ ...sample, filters: Array(31).fill(sample.filters[0]) })), null);
assert.equal(validatedGuestScreenState("%not-a-valid-screen"), null);
assert.equal(validatedGuestScreenState(null), null);

const storedRecord = encodePendingScreenRecord(raw, 1_000);
assert(storedRecord);
assert.equal(decodePendingScreenRecord(storedRecord, 1_000), raw);
assert.equal(decodePendingScreenRecord(storedRecord, 1_000 + PENDING_SCREEN_TTL_MS - 1), raw);
assert.equal(decodePendingScreenRecord(storedRecord, 1_000 + PENDING_SCREEN_TTL_MS), null);
assert.equal(decodePendingScreenRecord('{"state":"invalid","expiresAt":5000}', 1_000), null);
assert.equal(decodePendingScreenRecord("bad json"), null);

console.log("Growth signup-handoff regressions passed.");
