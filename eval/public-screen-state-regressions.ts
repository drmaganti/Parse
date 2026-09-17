import assert from "node:assert/strict";
import { FIELDS, RANKINGS } from "../lib/fields";
import { PUBLIC_SCREENS, getPublicScreen, publicScreenFilters } from "../lib/publicScreens";
import { decodeScreenState, encodeScreenState } from "../lib/screen-state";

for (const screen of PUBLIC_SCREENS) {
  assert.equal(screen.state.version, 1, `${screen.slug} should use saved-state version 1`);
  assert(RANKINGS[screen.state.ranking], `${screen.slug} has an unknown ranking`);
  assert(screen.state.filters.length > 0, `${screen.slug} should have at least one saved filter`);
  for (const item of screen.state.filters) assert(FIELDS[item.field], `${screen.slug} has an unknown field: ${item.field}`);

  const filters = publicScreenFilters(screen);
  assert.equal(filters.length, screen.state.filters.length, `${screen.slug} should materialize every saved filter`);
  const encoded = encodeScreenState({ version: 1, q: screen.query, filters, ranking: screen.state.ranking });
  const decoded = decodeScreenState(encoded);
  assert(decoded, `${screen.slug} saved state should round-trip`);
  assert.equal(decoded.version, 1);
  assert.equal(decoded.ranking, screen.state.ranking);
  assert.deepEqual(decoded.filters.map(({ field, op, value }) => ({ field, op, value })), screen.state.filters);

  const queryString = new URLSearchParams({ state: encoded, source: `public_screen:${screen.slug}` }).toString();
  const stateFromUrl = new URLSearchParams(queryString).get("state");
  assert(decodeScreenState(stateFromUrl), `${screen.slug} state should survive a URL round-trip`);
}

function has(slug: string, field: string, op: string, value: number | string) {
  const screen = getPublicScreen(slug);
  assert(screen, `missing public screen: ${slug}`);
  assert(screen.state.filters.some((item) => item.field === field && item.op === op && item.value === value), `${slug} is missing ${field} ${op} ${value}`);
}

has("high-fcf-yield", "operatingMargin", ">", 0);
has("growing-stocks-with-momentum", "chg1w", ">", 0);
has("low-pe-growing-stocks", "revGrowth", ">", 0);
has("dividend-growth-candidates", "revGrowth", ">", 0);
has("undervalued-growth-stocks", "revGrowth", ">", 0);

const legacy = encodeURIComponent(JSON.stringify({ q: "P/E below 15", r: "value", f: [["pe", "<", 15, 0]] }));
assert.equal(decodeScreenState(legacy)?.version, 1, "legacy unversioned links should migrate to v1");
const future = encodeURIComponent(JSON.stringify({ v: 2, q: "future", r: "marketCap", f: [] }));
assert.equal(decodeScreenState(future), null, "unknown future state versions should fail safely");

console.log(`Validated ${PUBLIC_SCREENS.length} versioned popular-screen states.`);
