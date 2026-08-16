import { FIELDS, RANKINGS, type Filter, type Op } from "./fields";

export interface ScreenUniverse {
  type: "collection";
  slug: string;
  label?: string;
}

export interface ScreenState {
  q: string;
  ranking: string;
  filters: Filter[];
  universe?: ScreenUniverse;
}

const OPS = new Set<Op>(["<", "<=", ">", ">=", "==", "!="]);

export function encodeScreenState(state: ScreenState): string {
  const payload = {
    q: state.q,
    r: state.ranking,
    f: state.filters.map((f) => [f.field, f.op, f.value, f.source === "user" ? 1 : f.source === "default" ? 2 : 0]),
    u: state.universe ? [state.universe.type, state.universe.slug, state.universe.label || ""] : undefined,
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeScreenState(raw: string | null | undefined): ScreenState | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(decodeURIComponent(raw));
    const filters: Filter[] = Array.isArray(j.f) ? j.f.flatMap((a: unknown, i: number) => {
      if (!Array.isArray(a) || a.length < 3) return [];
      const [field, op, value, source] = a as [string, Op, number | string, number?];
      if (!FIELDS[field] || !OPS.has(op) || value === undefined || value === null) return [];
      return [{ id: `${field}_${op}_state_${i}`, field, op, value, source: source === 2 ? "default" as const : source === 1 ? "user" as const : "ai" as const }];
    }) : [];
    const ranking = typeof j.r === "string" && RANKINGS[j.r] ? j.r : "marketCap";
    const universe = Array.isArray(j.u) && j.u[0] === "collection" && typeof j.u[1] === "string"
      ? { type: "collection" as const, slug: j.u[1], label: typeof j.u[2] === "string" ? j.u[2] : undefined }
      : undefined;
    return { q: typeof j.q === "string" ? j.q : "", ranking, filters, universe };
  } catch {
    return null;
  }
}

export function screenFingerprint(filters: Filter[], ranking: string, universe = "default"): string {
  const normalized = filters
    .map((f) => [f.field, f.op, String(f.value)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return JSON.stringify({ universe, ranking, filters: normalized });
}

export function screenSlug(title: string): string {
  const slug = title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
  return slug || "screen";
}
