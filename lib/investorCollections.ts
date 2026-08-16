export interface InvestorCollection {
  slug: string;
  name: string;
  searchName: string;
  manager: string;
  cik: string;
  title: string;
  description: string;
  summary: string;
  examples: string[];
}

export const INVESTOR_COLLECTIONS: InvestorCollection[] = [
  {
    slug: "warren-buffett",
    name: "Berkshire Hathaway",
    searchName: "Warren Buffett",
    manager: "Berkshire Hathaway Inc.",
    cik: "0001067983",
    title: "Warren Buffett Stocks: Berkshire Hathaway Portfolio & Holdings",
    description: "See Berkshire Hathaway's latest reported U.S. stock holdings, portfolio changes and valuation metrics, then screen Warren Buffett stocks in plain English with Parse.",
    summary: "Berkshire Hathaway's latest reported U.S. 13F equity holdings, commonly searched as Warren Buffett's portfolio.",
    examples: [
      "Which Buffett stocks are cheapest?",
      "Buffett stocks with P/E below 20",
      "Large Buffett holdings outside technology",
      "Which Buffett holdings have the strongest revenue growth?",
    ],
  },
];

export function investorCollection(slug: string) {
  return INVESTOR_COLLECTIONS.find((c) => c.slug === slug);
}
