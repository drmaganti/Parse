export type InvestorSource = "sec13f" | "ark-fund-csv";

export interface InvestorCollection {
  slug: string;
  name: string;
  searchName: string;
  manager: string;
  cik: string;
  source: InvestorSource;
  sourceLabel: string;
  sourceUrl?: string;
  title: string;
  description: string;
  summary: string;
  associationNote: string;
  freshnessNote: string;
  examples: string[];
}

export const INVESTOR_COLLECTIONS: InvestorCollection[] = [
  {
    slug: "warren-buffett",
    name: "Berkshire Hathaway",
    searchName: "Warren Buffett",
    manager: "Berkshire Hathaway Inc.",
    cik: "0001067983",
    source: "sec13f",
    sourceLabel: "SEC Form 13F",
    title: "Warren Buffett Stocks: Berkshire Hathaway Portfolio & Holdings",
    description: "See Berkshire Hathaway's latest reported U.S. stock holdings, portfolio changes and valuation metrics, then screen Warren Buffett stocks in plain English with Parse.",
    summary: "Berkshire Hathaway's latest reported U.S. 13F equity holdings, commonly searched as Warren Buffett's portfolio.",
    associationNote: "Warren Buffett is closely associated with Berkshire Hathaway's investing record, but the filing belongs to Berkshire Hathaway and is not Buffett's personal brokerage account.",
    freshnessNote: "Form 13F is reported quarterly and may be filed up to 45 days after quarter-end.",
    examples: [
      "Which Buffett stocks are cheapest?",
      "Buffett stocks with P/E below 20",
      "Large Buffett holdings outside technology",
      "Which Buffett holdings have the strongest revenue growth?",
    ],
  },
  {
    slug: "bill-ackman",
    name: "Pershing Square",
    searchName: "Bill Ackman",
    manager: "Pershing Square Capital Management, L.P.",
    cik: "0001336528",
    source: "sec13f",
    sourceLabel: "SEC Form 13F",
    title: "Bill Ackman Stocks: Pershing Square Portfolio & Holdings",
    description: "See Pershing Square's latest reported U.S. stock holdings, portfolio changes and valuation metrics, then screen Bill Ackman stocks in plain English with Parse.",
    summary: "Pershing Square's latest reported U.S. 13F equity holdings, commonly searched as Bill Ackman's portfolio.",
    associationNote: "Bill Ackman leads Pershing Square, but these are Pershing Square's reported holdings rather than a personal brokerage account.",
    freshnessNote: "Form 13F is reported quarterly and may be filed up to 45 days after quarter-end.",
    examples: [
      "Which Ackman stocks are cheapest?",
      "Ackman holdings with P/E below 25",
      "Large Pershing Square holdings with strong revenue growth",
      "Which Ackman holdings have the highest dividend yield?",
    ],
  },
  {
    slug: "cathie-wood",
    name: "ARK Innovation ETF (ARKK)",
    searchName: "Cathie Wood",
    manager: "ARK Investment Management LLC",
    cik: "0001697748",
    source: "ark-fund-csv",
    sourceLabel: "ARK Innovation ETF holdings",
    sourceUrl: "https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv",
    title: "Cathie Wood Stocks: ARKK Portfolio & Holdings",
    description: "See the latest published ARK Innovation ETF (ARKK) holdings and weights, then screen Cathie Wood stocks in plain English with Parse.",
    summary: "ARK Innovation ETF's latest published holdings, commonly searched as Cathie Wood's stocks or ARKK holdings.",
    associationNote: "Cathie Wood is ARK's founder, CEO and CIO. This collection tracks the ARK Innovation ETF (ARKK), not every position held across all ARK funds or Wood personally.",
    freshnessNote: "ARK publishes fund holdings more frequently than quarterly 13F filings; Parse refreshes this ARKK collection on weekdays from ARK's published holdings file.",
    examples: [
      "Which Cathie Wood stocks are growing fastest?",
      "ARKK stocks with P/E below 30",
      "Cathie Wood stocks outside technology",
      "Which ARKK holdings have the strongest momentum?",
    ],
  },
  {
    slug: "michael-burry",
    name: "Scion Asset Management",
    searchName: "Michael Burry",
    manager: "Scion Asset Management, LLC",
    cik: "0001649339",
    source: "sec13f",
    sourceLabel: "SEC Form 13F",
    title: "Michael Burry Stocks: Scion Asset Management Portfolio & Holdings",
    description: "See Scion Asset Management's latest available reported U.S. stock holdings and portfolio changes, then screen Michael Burry stocks in plain English with Parse.",
    summary: "Scion Asset Management's latest available 13F holdings, commonly searched as Michael Burry's portfolio.",
    associationNote: "Michael Burry is closely associated with Scion Asset Management, but the filing reports Scion's institutional positions rather than a personal brokerage account.",
    freshnessNote: "Scion's latest available Form 13F may be older than other managers if no newer filing has been submitted. Parse always shows the report and filing dates.",
    examples: [
      "Which Michael Burry stocks are cheapest?",
      "Burry holdings with low P/E ratios",
      "Which Scion holdings are most beaten down?",
      "Burry stocks outside technology",
    ],
  },
  {
    slug: "stanley-druckenmiller",
    name: "Duquesne Family Office",
    searchName: "Stanley Druckenmiller",
    manager: "Duquesne Family Office LLC",
    cik: "0001536411",
    source: "sec13f",
    sourceLabel: "SEC Form 13F",
    title: "Stanley Druckenmiller Stocks: Duquesne Portfolio & Holdings",
    description: "See Duquesne Family Office's latest reported U.S. stock holdings and portfolio changes, then screen Stanley Druckenmiller stocks in plain English with Parse.",
    summary: "Duquesne Family Office's latest reported U.S. 13F equity holdings, commonly searched as Stanley Druckenmiller's portfolio.",
    associationNote: "Stanley Druckenmiller runs Duquesne Family Office, but the filing reports the firm's institutional holdings rather than a personal brokerage account.",
    freshnessNote: "Form 13F is reported quarterly and may be filed up to 45 days after quarter-end.",
    examples: [
      "Which Druckenmiller stocks have the strongest growth?",
      "Druckenmiller holdings with P/E below 25",
      "Large Duquesne holdings with strong momentum",
      "Which Druckenmiller stocks pay dividends?",
    ],
  },
  {
    slug: "ray-dalio",
    name: "Bridgewater Associates",
    searchName: "Ray Dalio",
    manager: "Bridgewater Associates, LP",
    cik: "0001350694",
    source: "sec13f",
    sourceLabel: "SEC Form 13F",
    title: "Ray Dalio Stocks: Bridgewater Associates Portfolio & Holdings",
    description: "See Bridgewater Associates' latest reported U.S. stock holdings and portfolio changes, then screen Ray Dalio stocks in plain English with Parse.",
    summary: "Bridgewater Associates' latest reported U.S. 13F equity holdings, commonly searched as Ray Dalio's portfolio.",
    associationNote: "Ray Dalio founded Bridgewater Associates, but Bridgewater is an institution with its own investment team. These filings should not be read as Dalio's personal holdings or current personal investment decisions.",
    freshnessNote: "Form 13F is reported quarterly and may be filed up to 45 days after quarter-end.",
    examples: [
      "Which Bridgewater stocks are cheapest?",
      "Ray Dalio holdings with the highest dividend yield",
      "Large Bridgewater holdings outside technology",
      "Which Bridgewater holdings have the strongest revenue growth?",
    ],
  },
];

export function investorCollection(slug: string) {
  return INVESTOR_COLLECTIONS.find((c) => c.slug === slug);
}
