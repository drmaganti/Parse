export type PublicScreen = {
  slug: string;
  title: string;
  query: string;
  summary: string;
  criteria: string[];
  category: "value" | "income" | "growth" | "momentum" | "quality" | "pullback";
};

export const PUBLIC_SCREENS: PublicScreen[] = [
  {
    slug: "cheap-large-cap-stocks",
    title: "Cheap large-cap stocks",
    query: "Large-cap stocks with a P/E under 15, cheapest first",
    summary: "A simple value screen for larger companies trading at relatively low earnings multiples.",
    criteria: ["Large market capitalization", "P/E below 15", "Ranked from lower to higher P/E"],
    category: "value",
  },
  {
    slug: "high-dividend-low-volatility-stocks",
    title: "High-dividend, low-volatility stocks",
    query: "Dividend stocks yielding over 3% with beta below 1",
    summary: "Looks for income-producing companies whose shares have historically moved less than the broad market.",
    criteria: ["Dividend yield above 3%", "Beta below 1", "Daily-refreshed stock universe"],
    category: "income",
  },
  {
    slug: "profitable-stocks-near-52-week-lows",
    title: "Profitable stocks near 52-week lows",
    query: "Profitable companies trading more than 20% below their 52-week highs",
    summary: "A pullback screen for companies that remain profitable while their share prices sit well below recent highs.",
    criteria: ["Positive profitability", "At least 20% below the 52-week high", "No recommendation layer"],
    category: "pullback",
  },
  {
    slug: "high-growth-reasonable-valuation",
    title: "High growth at a reasonable valuation",
    query: "Companies growing revenue more than 20% with a P/E under 30",
    summary: "Combines strong top-line growth with a valuation ceiling instead of screening on growth alone.",
    criteria: ["Revenue growth above 20%", "P/E below 30", "Editable thresholds in Parse"],
    category: "growth",
  },
  {
    slug: "oversold-large-cap-stocks",
    title: "Oversold large-cap stocks",
    query: "Large-cap stocks with RSI below 30",
    summary: "A technical pullback screen for larger companies with low relative-strength readings.",
    criteria: ["Large market capitalization", "RSI below 30", "Research screen, not a buy signal"],
    category: "pullback",
  },
  {
    slug: "quality-momentum-stocks",
    title: "Quality stocks with momentum",
    query: "Profitable companies near their 52-week highs with strong recent momentum",
    summary: "Looks for profitable companies whose prices are holding near recent highs rather than trying to catch a falling stock.",
    criteria: ["Positive profitability", "Near 52-week highs", "Strong recent price momentum"],
    category: "momentum",
  },
  {
    slug: "beaten-down-still-growing",
    title: "Beaten-down stocks that are still growing",
    query: "Stocks more than 15% below their 52-week highs that still have positive revenue growth",
    summary: "Separates price weakness from business contraction by requiring continued revenue growth.",
    criteria: ["More than 15% below 52-week high", "Positive revenue growth", "Rankable by the size of the pullback"],
    category: "pullback",
  },
  {
    slug: "low-debt-dividend-stocks",
    title: "Dividend stocks with lower debt",
    query: "Dividend stocks yielding over 2.5% with low debt to equity",
    summary: "An income screen that adds a balance-sheet constraint to dividend yield.",
    criteria: ["Dividend yield above 2.5%", "Lower debt-to-equity", "Transparent filter interpretation"],
    category: "income",
  },
  {
    slug: "large-cap-value-stocks",
    title: "Large-cap value stocks",
    query: "Large companies with low P/E and low price-to-book ratios",
    summary: "A broad value screen using two common valuation measures rather than a single ratio.",
    criteria: ["Large market capitalization", "Lower P/E", "Lower price-to-book"],
    category: "value",
  },
  {
    slug: "profitable-tech-on-sale",
    title: "Profitable technology stocks on a pullback",
    query: "Profitable technology companies more than 15% below their 52-week highs",
    summary: "Narrows pullback hunting to profitable companies in the technology sector.",
    criteria: ["Technology sector", "Positive profitability", "At least 15% below 52-week high"],
    category: "pullback",
  },
  {
    slug: "high-roic-companies",
    title: "High-return businesses",
    query: "Companies with strong return on equity and positive revenue growth",
    summary: "A quality-oriented screen for businesses combining strong returns with continued growth.",
    criteria: ["Strong return on equity", "Positive revenue growth", "Rankable by quality metrics"],
    category: "quality",
  },
  {
    slug: "revenue-growth-leaders",
    title: "Revenue growth leaders",
    query: "Large companies growing revenue more than 25% a year",
    summary: "A straightforward screen for larger companies posting rapid top-line expansion.",
    criteria: ["Large market capitalization", "Revenue growth above 25%", "Editable growth threshold"],
    category: "growth",
  },
  {
    slug: "low-pe-profitable-stocks",
    title: "Profitable stocks with low P/E ratios",
    query: "Profitable companies with a P/E below 12",
    summary: "A compact value screen that avoids including loss-making companies simply because a valuation field looks unusual.",
    criteria: ["Positive profitability", "P/E below 12", "Ranked by valuation if desired"],
    category: "value",
  },
  {
    slug: "dividend-growth-candidates",
    title: "Dividend growth candidates",
    query: "Profitable dividend stocks with positive revenue growth and yield above 2%",
    summary: "Looks for dividend-paying companies that are also profitable and still growing revenue.",
    criteria: ["Dividend yield above 2%", "Positive profitability", "Positive revenue growth"],
    category: "income",
  },
  {
    slug: "stocks-near-52-week-highs",
    title: "Stocks near 52-week highs",
    query: "Large-cap stocks within 5% of their 52-week highs",
    summary: "A momentum screen for larger stocks trading close to their strongest prices of the past year.",
    criteria: ["Large market capitalization", "Within 5% of 52-week high", "Momentum-oriented, not a recommendation"],
    category: "momentum",
  },
  {
    slug: "low-volatility-large-caps",
    title: "Low-volatility large caps",
    query: "Large-cap stocks with beta below 0.8",
    summary: "A simple screen for larger companies whose shares have historically been less volatile than the broad market.",
    criteria: ["Large market capitalization", "Beta below 0.8", "Daily-refreshed market data"],
    category: "quality",
  },
  {
    slug: "strong-momentum-large-caps",
    title: "Large caps with strong momentum",
    query: "Large-cap stocks with strong one-month performance and RSI above 55",
    summary: "Combines recent price strength with an above-neutral RSI reading.",
    criteria: ["Large market capitalization", "Positive one-month momentum", "RSI above 55"],
    category: "momentum",
  },
  {
    slug: "mega-cap-pullbacks",
    title: "Mega-cap pullbacks",
    query: "Very large companies more than 10% below their 52-week highs",
    summary: "Finds major companies that have pulled back meaningfully from their recent highs.",
    criteria: ["Very large market capitalization", "More than 10% below 52-week high", "Rankable by pullback size"],
    category: "pullback",
  },
  {
    slug: "quality-stocks-on-a-pullback",
    title: "Quality stocks on a pullback",
    query: "Profitable companies with positive revenue growth that are at least 10% below their 52-week highs",
    summary: "Combines basic operating quality with a meaningful price pullback.",
    criteria: ["Positive profitability", "Positive revenue growth", "At least 10% below 52-week high"],
    category: "quality",
  },
  {
    slug: "undervalued-growth-stocks",
    title: "Undervalued growth stocks",
    query: "Companies with positive revenue growth, a P/E under 20, and a price-to-book under 4",
    summary: "A blended screen for growth plus valuation discipline using both earnings and book-value ratios.",
    criteria: ["Positive revenue growth", "P/E below 20", "Price-to-book below 4"],
    category: "growth",
  },
];

export function getPublicScreen(slug: string) {
  return PUBLIC_SCREENS.find((screen) => screen.slug === slug);
}
