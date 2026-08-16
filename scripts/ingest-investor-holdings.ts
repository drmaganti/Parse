import { createClient } from "@supabase/supabase-js";
import { INVESTOR_COLLECTIONS, type InvestorCollection } from "../lib/investorCollections";

type Holding = {
  issuer: string;
  titleClass: string;
  cusip: string;
  valueUsd: number;
  shares: number | null;
  ticker?: string | null;
  portfolioWeight?: number | null;
};

type Snapshot = {
  reportDate: string;
  filingDate: string;
  accession: string;
  holdings: Holding[];
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const UA = process.env.SEC_USER_AGENT || "Parse/1.0 (+https://getparse.app)";
const secHeaders = { "User-Agent": UA, Accept: "application/json,text/xml,application/xml,text/plain,*/*" };
const webHeaders = { "User-Agent": "Mozilla/5.0 Parse/1.0 (+https://getparse.app)", Accept: "text/csv,text/plain,*/*" };

function xmlText(block: string, tag: string) {
  const m = block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim() : "";
}

function normalizeName(value: string) {
  return value.toUpperCase().replace(/&/g, " AND ").replace(/\b(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|PLC|LTD|LIMITED|DEL|HOLDINGS?)\b/g, " ").replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

const aliases: Record<string, string> = {
  "APPLE": "AAPL", "AMERICAN EXPRESS": "AXP", "BK OF AMERICA": "BAC", "BANK OF AMERICA": "BAC", "BANK OF AMER": "BAC", "COCA COLA": "KO", "CHEVRON": "CVX", "MOODYS": "MCO", "OCCIDENTAL PETROLEUM": "OXY", "OCCIDENTAL PETE": "OXY", "CHUBB": "CB", "KRAFT HEINZ": "KHC", "DAVITA": "DVA", "VERISIGN": "VRSN", "SIRIUS XM": "SIRI", "SIRIUSXM": "SIRI", "DOMINOS PIZZA": "DPZ", "POOL": "POOL", "NVR": "NVR", "LENNAR": "LEN", "D R HORTON": "DHI", "NUCOR": "NUE", "CONSTELLATION BRANDS": "STZ", "NEW YORK TIMES": "NYT", "NEW YORK TIMES MTN BE": "NYT", "DELTA AIR LINES": "DAL", "MACYS": "M", "CAPITAL ONE FINANCIAL": "COF", "CAPITAL ONE FINL": "COF", "ALLY FINANCIAL": "ALLY", "ALLY FINL": "ALLY", "KROGER": "KR", "AMAZON COM": "AMZN", "UNITEDHEALTH GROUP": "UNH", "HEICO": "HEI", "ALPHABET": "GOOGL", "LOUISIANA PAC": "LPX", "JEFFERIES FINANCIAL GROUP IN": "JEF",
};

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: secHeaders });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<any>;
}

async function fetchText(url: string, headers: Record<string, string> = secHeaders) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

async function latest13F(cik: string): Promise<Snapshot> {
  const submissions = await fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`);
  const recent = submissions.filings.recent;
  const i = recent.form.findIndex((f: string) => f === "13F-HR");
  if (i < 0) throw new Error(`No 13F-HR found for ${cik}`);
  const accession = recent.accessionNumber[i] as string;
  const reportDate = recent.reportDate[i] as string;
  const filingDate = recent.filingDate[i] as string;
  const cikNum = String(Number(cik));
  const dir = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accession.replace(/-/g, "")}`;
  const index = await fetchJson(`${dir}/index.json`);
  const items = (index.directory?.item || []).filter((x: any) => typeof x.name === "string" && /\.xml$/i.test(x.name) && !/primary/i.test(x.name));
  if (!items.length) throw new Error(`No information-table XML in ${accession}`);
  items.sort((a: any, b: any) => ((/info|table|13f/i.test(b.name) ? 1e9 : 0) + Number(b.size || 0)) - ((/info|table|13f/i.test(a.name) ? 1e9 : 0) + Number(a.size || 0)));
  const xml = await fetchText(`${dir}/${items[0].name}`);
  return { accession, reportDate, filingDate, holdings: aggregateHoldings(parse13FHoldings(xml)) };
}

function parse13FHoldings(xml: string): Holding[] {
  const blocks = [...xml.matchAll(/<(?:\w+:)?infoTable[^>]*>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi)].map((m) => m[1]);
  return blocks.map((block) => ({
    issuer: xmlText(block, "nameOfIssuer"),
    titleClass: xmlText(block, "titleOfClass"),
    cusip: xmlText(block, "cusip"),
    valueUsd: Number(xmlText(block, "value") || 0),
    shares: Number(xmlText(block, "sshPrnamt") || 0) || null,
  })).filter((h) => h.issuer && h.cusip);
}

function aggregateHoldings(holdings: Holding[]): Holding[] {
  const byCusip = new Map<string, Holding>();
  for (const holding of holdings) {
    const current = byCusip.get(holding.cusip);
    if (!current) {
      byCusip.set(holding.cusip, { ...holding });
      continue;
    }
    current.valueUsd += holding.valueUsd;
    current.shares = current.shares == null && holding.shares == null ? null : (current.shares || 0) + (holding.shares || 0);
  }
  return [...byCusip.values()];
}

function splitCsvLine(line: string) {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cell.trim()); cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

function normalizedHeader(value: string) {
  return value.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function numeric(value: string | undefined) {
  if (!value) return null;
  const n = Number(value.replace(/[$,%]/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function isoDate(value: string) {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function latestArkFund(collection: InvestorCollection): Promise<Snapshot> {
  if (!collection.sourceUrl) throw new Error(`Missing ARK source URL for ${collection.slug}`);
  const csv = await fetchText(collection.sourceUrl, webHeaders);
  const lines = csv.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  const headerIndex = lines.findIndex((line) => {
    const h = splitCsvLine(line).map(normalizedHeader);
    return h.includes("date") && h.includes("fund") && h.includes("company") && h.includes("ticker");
  });
  if (headerIndex < 0) throw new Error(`Could not find ARK holdings CSV header for ${collection.slug}`);
  const headers = splitCsvLine(lines[headerIndex]).map(normalizedHeader);
  const parsed = lines.slice(headerIndex + 1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => { row[header] = cells[i] || ""; });
    const date = isoDate(row.date || "");
    const ticker = (row.ticker || "").trim().toUpperCase();
    const issuer = (row.company || "").trim();
    const fund = (row.fund || "").trim().toUpperCase();
    if (!date || !ticker || !issuer || fund !== "ARKK") return null;
    return {
      date,
      holding: {
        issuer,
        ticker,
        titleClass: "ARKK",
        cusip: (row.cusip || ticker).trim() || ticker,
        shares: numeric(row.shares),
        valueUsd: numeric(row["market value"]) || 0,
        portfolioWeight: numeric(row.weight),
      } satisfies Holding,
    };
  }).filter(Boolean) as { date: string; holding: Holding }[];
  if (!parsed.length) throw new Error(`No ARKK holdings parsed for ${collection.slug}`);
  const reportDate = parsed[0].date;
  const holdings = parsed.filter((row) => row.date === reportDate).map((row) => row.holding);
  return { reportDate, filingDate: reportDate, accession: `ARKK-${reportDate}`, holdings };
}

async function previousSnapshot(slug: string, reportDate: string) {
  const { data, error } = await supabase
    .from("investor_holdings")
    .select("cusip,shares,report_date")
    .eq("collection_slug", slug)
    .lt("report_date", reportDate)
    .order("report_date", { ascending: false })
    .limit(2000);
  if (error) throw error;
  const previousDate = data?.[0]?.report_date;
  const previous = new Map((data || []).filter((r: any) => r.report_date === previousDate).map((r: any) => [r.cusip, Number(r.shares || 0)]));
  return { previousDate, previous };
}

async function main() {
  const { data: stockData, error: stockError } = await supabase.from("stocks").select("symbol,name");
  if (stockError) throw stockError;
  const stockMap = new Map((stockData || []).map((s: any) => [normalizeName(s.name), s.symbol]));

  for (const collection of INVESTOR_COLLECTIONS) {
    const snapshot = collection.source === "ark-fund-csv" ? await latestArkFund(collection) : await latest13F(collection.cik);
    const { previousDate, previous } = await previousSnapshot(collection.slug, snapshot.reportDate);
    const total = snapshot.holdings.reduce((sum, h) => sum + h.valueUsd, 0);

    const rows = snapshot.holdings.map((h) => {
      const normalized = normalizeName(h.issuer);
      let ticker = h.ticker || stockMap.get(normalized) || aliases[normalized] || null;
      if (/^ALPHABET\b/.test(normalized) && !h.ticker) ticker = /CL C|CLASS C/i.test(h.titleClass) ? "GOOG" : "GOOGL";
      if (/^LIBERTY LIVE\b/.test(normalized) && !h.ticker) ticker = /SER C/i.test(h.titleClass) ? "LLYVK" : "LLYVA";
      const prior = previous.get(h.cusip);
      const change = prior == null || h.shares == null ? null : h.shares - prior;
      const changePct = prior && change != null ? (change / prior) * 100 : null;
      const changeType = !previousDate ? null : prior == null ? "new" : change == null || Math.abs(change) < 0.5 ? "unchanged" : change > 0 ? "increased" : "reduced";
      return {
        collection_slug: collection.slug,
        report_date: snapshot.reportDate,
        filing_date: snapshot.filingDate,
        accession_number: snapshot.accession,
        issuer: h.issuer,
        ticker,
        title_class: h.titleClass,
        cusip: h.cusip,
        shares: h.shares,
        value_usd: h.valueUsd,
        portfolio_weight: h.portfolioWeight ?? (total ? h.valueUsd / total * 100 : null),
        change_type: changeType,
        share_change: change,
        share_change_pct: changePct,
        updated_at: new Date().toISOString(),
      };
    });

    if (collection.source === "ark-fund-csv") {
      const { error: clearError } = await supabase.from("investor_holdings").delete().eq("collection_slug", collection.slug).eq("report_date", snapshot.reportDate);
      if (clearError) throw clearError;
    }
    const { error } = await supabase.from("investor_holdings").upsert(rows, { onConflict: "collection_slug,report_date,cusip" });
    if (error) throw error;
    const mapped = rows.filter((row) => row.ticker).length;
    console.log(`${collection.slug}: ${rows.length} holdings from ${snapshot.reportDate}; ${mapped} tickers mapped (${snapshot.accession})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
