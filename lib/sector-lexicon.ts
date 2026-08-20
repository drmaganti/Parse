import type { Op } from "./fields";

export type SectorLexiconMatch = {
  phrase: string;
  sector: string;
  op: Extract<Op, "==" | "!=">;
};

// Seeded from the current GICS sector/industry hierarchy, then supplemented
// with common investor shorthand. Parse intentionally combines Consumer
// Discretionary and Consumer Staples into its single Consumer sector.
const GROUPS: Array<{ sector: string; pattern: RegExp; promptTerms: string[] }> = [
  {
    sector: "Technology",
    pattern: /\binformation technology\b|\btechnology\b|\btech\b|\bsoftware\b|\bsaas\b|\bcloud[- ](?:computing|platforms?|software|vendors?)\b|\bcybersecurity\b|\bsemiconductors?\b|\bsemis\b|\bchipmakers?\b|\bchip[- ]fabrication\b|\bit services?\b|\btechnology hardware\b|\bcomputer hardware\b|\belectronic equipment\b|\bcommunications equipment\b/gi,
    promptTerms: ["tech", "software", "SaaS", "cloud computing", "cybersecurity", "semiconductors", "chipmakers", "IT services", "hardware"],
  },
  {
    sector: "Financials",
    pattern: /\bfinancials?\b|\bbanks?\b|\bbanking\b|\blenders?\b|\bcredit originators?\b|\bthrifts?\b|\bmortgage finance\b|\bmortgage reits?\b|\bconsumer finance\b|\bdiversified financial services\b|\bcapital markets\b|\bbrokerages?\b|\bbrokers?\b|\basset managers?\b|\binvestment managers?\b|\binsurers?\b|\binsurance\b|\bpayment processors?\b/gi,
    promptTerms: ["banks", "lenders", "credit originators", "insurance", "brokers", "asset managers", "capital markets", "consumer finance", "payment processors", "mortgage finance"],
  },
  {
    sector: "Healthcare",
    pattern: /\bhealth\s*care\b|\bpharma(?:ceuticals?)?\b|\bdrugmakers?\b|\bdrug makers?\b|\bbiotech(?:nology)?\b|\blife sciences?\b|\bmedical[- ]devices?(?:\s+(?:makers?|manufacturers?|companies|firms))?\b|\bhealth care equipment\b|\bhealthcare equipment\b|\bhospitals?\b|\bmanaged care\b|\bhealth care providers?\b|\bhealthcare providers?\b|\bdiagnostics?\b/gi,
    promptTerms: ["healthcare", "pharma", "drugmakers", "biotech", "life sciences", "medical devices", "hospitals", "managed care", "healthcare providers", "diagnostics"],
  },
  {
    sector: "Consumer",
    pattern: /\bconsumer(?: discretionary| staples)?\b|\bretail(?:ers?|ing)?\b|\be[- ]commerce\b|\bautomobiles?\b|\bautomakers?\b|\bauto components?\b|\bapparel\b|\bluxury goods?\b|\bhousehold durables?\b|\bleisure products?\b|\bhotels?\b|\brestaurants?\b|\bfood products?\b|\bbeverages?\b|\btobacco\b|\bhousehold products?\b|\bpersonal products?\b|\bgrocers?\b|\bgrocery (?:stores?|chains?|retailers?)\b|\bstore chains?\b/gi,
    promptTerms: ["retail", "e-commerce", "automakers", "apparel", "luxury goods", "hotels", "restaurants", "food", "beverages", "household products"],
  },
  {
    sector: "Energy",
    pattern: /\benergy\b|\boil\s*(?:and|&)\s*gas\b|\boilfield\b|\boil field\b|\boil & gas\b|\bexploration\s*(?:and|&)\s*production\b|\be&p\b|\bdrilling\b|\brefiners?\b|\brefining\b|\bpetroleum\b|\bnatural gas producers?\b|\boil and gas pipelines?\b|\boilfield services?\b|\bcoal\b|\bconsumable fuels?\b/gi,
    promptTerms: ["oil & gas", "E&P", "drilling", "refiners", "petroleum", "pipelines", "oilfield services", "coal"],
  },
  {
    sector: "Industrials",
    pattern: /\bindustrial(?:s|\s+(?:firms|companies|businesses|names))?\b|\baerospace\s*(?:and|&)\s*defen[cs]e\b|\baerospace\b|\bdefen[cs]e contractors?\b|\bbuilding products?\b|\bconstruction\s*(?:and|&)\s*engineering\b|\belectrical equipment\b|\bindustrial conglomerates?\b|\bmachinery\b|\btrading companies\b|\bcommercial services\b|\bprofessional services\b|\bair freight\b|\blogistics\b|\bairlines?\b|\bmarine transport\b|\bshipping\b|\broad\s*(?:and|&)\s*rail\b|\brailroads?\b|\btrucking\b|\btransportation infrastructure\b|\bfactory operators?\b/gi,
    promptTerms: ["aerospace & defense", "machinery", "construction & engineering", "electrical equipment", "logistics", "airlines", "railroads", "trucking", "shipping"],
  },
  {
    sector: "Communications",
    pattern: /\bcommunication services\b|\bcommunications\b|\btelecommunications?\b|\btelecom\b|\bwireless carriers?\b|\bwireless telecommunication services\b|\bmedia companies\b|\bmedia\b|\bentertainment\b|\binteractive media\b|\bsocial media\b|\bbroadcasters?\b|\bbroadcasting\b|\bcable television\b/gi,
    promptTerms: ["telecom", "wireless carriers", "media", "entertainment", "interactive media", "social media", "broadcasters", "cable television"],
  },
  {
    sector: "Utilities",
    pattern: /\butilities\b|\butility companies\b|\belectric utilities\b|\bgas utilities\b|\bwater utilities\b|\bmulti[- ]utilities\b|\bindependent power producers?\b|\brenewable electricity producers?\b|\bpower[- ]grid operators?\b/gi,
    promptTerms: ["electric utilities", "gas utilities", "water utilities", "multi-utilities", "independent power producers", "renewable electricity producers", "power-grid operators"],
  },
  {
    sector: "Materials",
    pattern: /\bmaterials\b|\bchemicals?\b|\bconstruction materials?\b|\bcontainers?\s*(?:and|&)\s*packaging\b|\bpackaging companies\b|\bmetals?\s*(?:and|&)\s*mining\b|\bmetal producers?\b|\bmining companies\b|\bminers?\b|\bsteelmakers?\b|\bsteel producers?\b|\baluminum producers?\b|\bpaper\s*(?:and|&)\s*forest products\b|\bforest products\b|\bcement producers?\b/gi,
    promptTerms: ["chemicals", "construction materials", "packaging", "metals & mining", "steel", "aluminum", "paper", "forest products", "cement"],
  },
  {
    sector: "Real Estate",
    pattern: /\breal estate\b|\bequity reits?\b|\breits?\b|\bproperty trusts?\b|\bproperty developers?\b|\breal estate developers?\b|\breal estate services?\b|\bproperty management\b|\bapartment landlords?\b/gi,
    promptTerms: ["real estate", "equity REITs", "property trusts", "property developers", "real estate services", "property management", "apartment landlords"],
  },
];

function exclusionAt(query: string, start: number): boolean {
  const prefix = query.slice(Math.max(0, start - 35), start);
  return /\b(?:exclude|excluding|avoid|without|except|not|non[- ]?)\s*$/i.test(prefix);
}

export function matchSectorLexicon(query: string): SectorLexiconMatch[] {
  const matches: SectorLexiconMatch[] = [];
  for (const group of GROUPS) {
    group.pattern.lastIndex = 0;
    for (let match = group.pattern.exec(query); match; match = group.pattern.exec(query)) {
      const phrase = match[0];
      if (group.sector === "Real Estate" && /^reits?$/i.test(phrase) && /mortgage\s+reits?/i.test(query.slice(Math.max(0, match.index - 12), group.pattern.lastIndex))) continue;
      const op: SectorLexiconMatch["op"] = exclusionAt(query, match.index) ? "!=" : "==";
      if (!matches.some((item) => item.sector === group.sector && item.op === op && item.phrase.toLowerCase() === phrase.toLowerCase())) {
        matches.push({ phrase, sector: group.sector, op });
      }
    }
  }
  return matches;
}

export function sectorLexiconPrompt(): string {
  return GROUPS.map((group) => `${group.sector}: ${group.promptTerms.join(", ")}`).join("; ");
}
