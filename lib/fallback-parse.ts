import { FIELDS, RANKINGS, SECTORS, type Filter, type Op } from "./fields";

// Deterministic keyword parser. Used when the model call fails or returns
// nothing usable, so the product degrades to a working screen rather than an
// error. Intentionally simple; the model is the primary path.

export interface ParsedScreen {
  filters: Filter[];
  ranking: string;
  interpretation: string;
  assumptions: string[];
}

let counter = 0;
const mk = (field: string, op: Op, value: number | string): Filter => ({
  id: `${field}_${op}_${counter++}`,
  field, op, value, source: "ai",
});

export function fallbackParse(query: string, prev: Filter[] = [], lockedIds: string[] = []): ParsedScreen {
  const q = ` ${query.toLowerCase()} `;
  const out: Filter[] = [];
  const assumptions: string[] = [];
  let ranking = "marketCap";

  const peM = q.match(/p\/?e (?:under|below|less than|<)\s*(\d+)/);
  if (peM) out.push(mk("pe", "<", Number(peM[1])));
  const yM = q.match(/yield(?:ing)?\s*(?:over|above|>)?\s*(\d+(?:\.\d+)?)/);
  if (yM) out.push(mk("divYield", ">", Number(yM[1])));
  const gM = q.match(/growth\s*(?:over|above|>)?\s*(\d+)/);
  if (gM) out.push(mk("revGrowth", ">", Number(gM[1])));
  const mcM = q.match(/(?:market ?cap|cap)[^.]*?(?:over|above|greater than|at least|>)\s*\$?\s*(\d+)/);
  if (mcM) out.push(mk("marketCap", ">", Number(mcM[1])));
  const rsiM = q.match(/rsi\s*(?:under|below|less than|<)\s*(\d+)/);
  if (rsiM) out.push(mk("rsi", "<", Number(rsiM[1])));

  if (/cheap|value|undervalued|low p\/?e/.test(q)) { if (!peM) out.push(mk("pe", "<", 20)); out.push(mk("pb", "<", 4)); ranking = "value"; }
  if (/dividend|income|payout/.test(q)) { if (!yM) out.push(mk("divYield", ">", 3)); ranking = "dividend"; }
  if (/growth|growing|fast-growing/.test(q)) { if (!gM) out.push(mk("revGrowth", ">", 15)); ranking = "quality"; }
  if (/momentum|near (?:their )?(?:52|high)|breakout|strong/.test(q)) { out.push(mk("from52wHigh", ">", -6)); ranking = "momentum"; }
  if (/fallen|beaten|beaten-down|dropped|decline|sell-?off|slump/.test(q)) { out.push(mk("chg1w", "<", -2)); ranking = "decline"; }
  if (/oversold/.test(q) && !rsiM) out.push(mk("rsi", "<", 30));
  if (/low p\/?b/.test(q)) { out.push(mk("pb", "<", 3)); ranking = "value"; }
  if (/reasonable price|garp/.test(q)) { if (!/p\/?e/.test(q)) out.push(mk("pe", "<", 25)); assumptions.push("Read 'reasonable price' as P/E below 25"); }
  if (/won'?t crash|no crash|can'?t crash/.test(q)) { out.push(mk("beta", "<", 1)); assumptions.push("Read 'won't crash' as low volatility, beta below 1.0"); }
  if (/safe|defensive|low[- ]?risk|stable|conservative/.test(q)) { out.push(mk("beta", "<", 1)); assumptions.push("Read 'safe' as beta below 1.0"); }
  if (/large[- ]?cap|big|mega/.test(q)) out.push(mk("marketCap", ">", 50));
  if (/small[- ]?cap/.test(q)) out.push(mk("marketCap", "<", 20));

  for (const sec of SECTORS) {
    if (q.includes(sec.toLowerCase()) || (sec === "Technology" && /\btech\b/.test(q))) {
      out.push(mk("sector", "==", sec));
    }
  }

  // Preserve user-locked filters (sticky edits) on a refinement.
  let merged = out;
  if (prev.length) {
    const locked = prev.filter((f) => lockedIds.includes(f.id));
    const lockedFields = new Set(locked.map((f) => f.field));
    merged = [...locked, ...out.filter((f) => !lockedFields.has(f.field))];
  }
  if (!merged.length) merged = [mk("marketCap", ">", 50)];

  return {
    filters: merged,
    ranking: RANKINGS[ranking] ? ranking : "marketCap",
    interpretation: "Interpreted your request into the filters below.",
    assumptions,
  };
}
