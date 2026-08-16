import { createClient } from "@supabase/supabase-js";
import { INVESTOR_COLLECTIONS } from "../lib/investorCollections";

type SecHolding = { issuer: string; titleClass: string; cusip: string; valueUsd: number; shares: number | null };
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const UA = process.env.SEC_USER_AGENT || "Parse/1.0 (+https://getparse.app)";
const headers = { "User-Agent": UA, Accept: "application/json,text/xml,application/xml,text/plain,*/*" };

function xmlText(block: string, tag: string) {
  const m = block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i"));
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim() : "";
}
function normalizeName(value: string) {
  return value.toUpperCase().replace(/&/g, " AND ").replace(/\b(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|PLC|LTD|LIMITED|DEL|NEW|HOLDINGS?)\b/g, " ").replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
const aliases: Record<string, string> = {
  "APPLE": "AAPL", "AMERICAN EXPRESS": "AXP", "BK OF AMERICA": "BAC", "BANK OF AMERICA": "BAC", "BANK OF AMER": "BAC", "COCA COLA": "KO", "CHEVRON": "CVX", "MOODYS": "MCO", "OCCIDENTAL PETROLEUM": "OXY", "OCCIDENTAL PETE": "OXY", "CHUBB": "CB", "KRAFT HEINZ": "KHC", "DAVITA": "DVA", "VERISIGN": "VRSN", "SIRIUS XM": "SIRI", "SIRIUSXM": "SIRI", "DOMINOS PIZZA": "DPZ", "POOL": "POOL", "NVR": "NVR", "LENNAR": "LEN", "D R HORTON": "DHI", "NUCOR": "NUE", "CONSTELLATION BRANDS": "STZ", "NEW YORK TIMES": "NYT", "NEW YORK TIMES MTN BE": "NYT", "DELTA AIR LINES": "DAL", "MACYS": "M", "CAPITAL ONE FINANCIAL": "COF", "ALLY FINANCIAL": "ALLY", "ALLY FINL": "ALLY", "KROGER": "KR", "AMAZON COM": "AMZN", "UNITEDHEALTH GROUP": "UNH", "HEICO": "HEI", "ALPHABET": "GOOGL", "LOUISIANA PAC": "LPX", "JEFFERIES FINANCIAL GROUP IN": "JEF",
};

async function fetchJson(url: string) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json() as Promise<any>; }
async function fetchText(url: string) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); }

async function latest13F(cik: string) {
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
  return { accession, reportDate, filingDate, xml };
}

function parseHoldings(xml: string): SecHolding[] {
  const blocks = [...xml.matchAll(/<(?:\w+:)?infoTable[^>]*>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi)].map((m) => m[1]);
  return blocks.map((block) => ({ issuer: xmlText(block, "nameOfIssuer"), titleClass: xmlText(block, "titleOfClass"), cusip: xmlText(block, "cusip"), valueUsd: Number(xmlText(block, "value") || 0), shares: Number(xmlText(block, "sshPrnamt") || 0) || null })).filter((h) => h.issuer && h.cusip);
}

function aggregateHoldings(holdings: SecHolding[]): SecHolding[] {
  const byCusip = new Map<string, SecHolding>();
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

for (const collection of INVESTOR_COLLECTIONS) {
  const filing = await latest13F(collection.cik);
  const current = aggregateHoldings(parseHoldings(filing.xml));
  const { data: stockData } = await supabase.from("stocks").select("symbol,name");
  const stockMap = new Map((stockData || []).map((s: any) => [normalizeName(s.name), s.symbol]));
  const { data: previousRows } = await supabase.from("investor_holdings").select("cusip,shares,report_date").eq("collection_slug", collection.slug).lt("report_date", filing.reportDate).order("report_date", { ascending: false }).limit(500);
  const previousDate = previousRows?.[0]?.report_date;
  const previous = new Map((previousRows || []).filter((r: any) => r.report_date === previousDate).map((r: any) => [r.cusip, Number(r.shares || 0)]));
  const total = current.reduce((s, h) => s + h.valueUsd, 0);
  const rows = current.map((h) => {
    const normalized = normalizeName(h.issuer);
    let ticker = stockMap.get(normalized) || aliases[normalized] || null;
    if (/^ALPHABET\b/.test(normalized)) ticker = /CL C|CLASS C/i.test(h.titleClass) ? "GOOG" : "GOOGL";
    if (/^LIBERTY LIVE\b/.test(normalized)) ticker = /SER C/i.test(h.titleClass) ? "LLYVK" : "LLYVA";
    const prior = previous.get(h.cusip);
    const change = prior == null || h.shares == null ? null : h.shares - prior;
    const changePct = prior && change != null ? (change / prior) * 100 : null;
    const changeType = prior == null ? "new" : change == null || Math.abs(change) < 0.5 ? "unchanged" : change > 0 ? "increased" : "reduced";
    return { collection_slug: collection.slug, report_date: filing.reportDate, filing_date: filing.filingDate, accession_number: filing.accession, issuer: h.issuer, ticker, title_class: h.titleClass, cusip: h.cusip, shares: h.shares, value_usd: h.valueUsd, portfolio_weight: total ? h.valueUsd / total * 100 : null, change_type: changeType, share_change: change, share_change_pct: changePct, updated_at: new Date().toISOString() };
  });
  const { error } = await supabase.from("investor_holdings").upsert(rows, { onConflict: "collection_slug,report_date,cusip" });
  if (error) throw error;
  console.log(`${collection.slug}: ${rows.length} aggregated holdings from ${filing.reportDate} (${filing.accession})`);
}
