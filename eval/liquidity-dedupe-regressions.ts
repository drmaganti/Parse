import assert from "node:assert/strict";
import { runScreen } from "../lib/screen";
import type { Filter, StockRow } from "../lib/fields";

const rows = [
  { symbol: "GOOG", name: "Alphabet Inc", market_cap: 4200, avg_volume_20d: 1.1 },
  { symbol: "GOOGL", name: "Alphabet Inc", market_cap: 4200, avg_volume_20d: 28.4 },
  { symbol: "MSFT", name: "Microsoft Corp", market_cap: 3700, avg_volume_20d: 18.2 },
  { symbol: "THIN", name: "Thinly Traded Co", market_cap: 100, avg_volume_20d: 0.2 },
] as StockRow[];

const deduped = runScreen(rows, [], "marketCap", Infinity);
assert.equal(deduped.filter((row) => row.name === "Alphabet Inc").length, 1, "one issuer should appear once");
assert.equal(deduped.find((row) => row.name === "Alphabet Inc")?.symbol, "GOOGL", "the more liquid share class should win");

const liquidity: Filter = {
  id: "avgVolume20d_>_test",
  field: "avgVolume20d",
  op: ">",
  value: 2,
  source: "user",
};
const liquid = runScreen(rows, [liquidity], "marketCap", Infinity);
assert.deepEqual(liquid.map((row) => row.symbol), ["GOOGL", "MSFT"], "20-day average volume should filter in millions of shares per day");

console.log("PASS liquidity + issuer dedupe regressions");
