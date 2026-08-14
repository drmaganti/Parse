export type MarketingPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  intro: string;
  sections: { title: string; body: string }[];
  faq: { q: string; a: string }[];
};

export const MARKETING_PAGES: MarketingPage[] = [
  {
    slug: "ai-stock-screener",
    title: "AI Stock Screener",
    description: "Use plain English to build transparent stock screens. Parse translates your idea into editable financial filters instead of hiding the logic behind an AI answer.",
    eyebrow: "AI STOCK SCREENER",
    headline: "Use AI to build the screen, not to hide the reasoning.",
    intro: "Parse is an AI-assisted stock screener for investors who know roughly what they want to find but do not want to translate every idea into a grid of financial fields. Describe the screen in everyday language, inspect how Parse interpreted it, change the filters, and run the screen yourself.",
    sections: [
      { title: "Natural language in, explicit filters out", body: "Ask for something like ‘technology companies with positive revenue growth more than 15% below their highs.’ Parse maps the request to concrete fields and thresholds. You can see that interpretation before treating the output as useful research." },
      { title: "AI is the interface, not the investment thesis", body: "Parse does not generate a mysterious list of stocks and ask you to trust it. The model’s job is narrower: translate your wording into a screening definition. The matching companies come from those visible rules." },
      { title: "Built for exploration", body: "A useful screen is rarely perfect on the first attempt. Change a threshold, remove a condition, or rephrase the request. Parse is designed to make that iteration faster without taking control away from you." },
    ],
    faq: [
      { q: "What is an AI stock screener?", a: "An AI stock screener uses an AI model to help interpret or construct stock-screening criteria. In Parse, AI translates natural language into explicit filters rather than directly recommending stocks." },
      { q: "Does Parse recommend stocks?", a: "No. Parse is a research and screening tool. It shows matches produced by visible criteria and does not provide investment advice." },
      { q: "Can I change the filters Parse creates?", a: "Yes. The filters are meant to be inspected and edited so the final screen reflects your intent." },
    ],
  },
  {
    slug: "natural-language-stock-screener",
    title: "Natural Language Stock Screener",
    description: "Describe a stock screen in plain English and turn it into editable financial filters with Parse.",
    eyebrow: "NATURAL LANGUAGE STOCK SCREENER",
    headline: "Describe the company you want to find. Parse builds the screen.",
    intro: "Traditional screeners start with a database of metrics. Parse starts with the idea in your head. Write the screen the way you would explain it to another person, then inspect the financial filters Parse creates from your wording.",
    sections: [
      { title: "Start with the idea", body: "You can begin with a phrase such as ‘beaten-down companies that are still growing’ instead of first deciding which field names, operators, and thresholds a screener expects." },
      { title: "See what the words became", body: "Natural language can be ambiguous. Parse exposes its interpretation as filters and assumptions so you can decide whether the screen actually says what you meant." },
      { title: "Keep the precision of a traditional screener", body: "Plain English is only the entry point. Once the screen exists, the criteria are explicit. That gives you the convenience of conversation without giving up the precision of measurable rules." },
    ],
    faq: [
      { q: "Can I type a stock-screening idea in normal English?", a: "Yes. Parse is designed specifically to translate plain-English screening requests into structured filters." },
      { q: "What happens when a request is vague?", a: "Parse can surface assumptions in the interpretation so you can revise the request or adjust the filters." },
      { q: "What market does Parse currently cover?", a: "Parse currently screens a universe built from the S&P 500 and Nasdaq 100, with data refreshed daily." },
    ],
  },
  {
    slug: "free-ai-stock-screener",
    title: "Free AI Stock Screener",
    description: "Try an AI-assisted stock screener without creating an account. Describe a screen in plain English and inspect the filters Parse creates.",
    eyebrow: "FREE AI STOCK SCREENER",
    headline: "Try natural-language stock screening before creating an account.",
    intro: "Parse lets visitors run guest screens without signing up first. That makes it possible to test whether natural-language screening fits the way you research before deciding whether you want to save screens in an account.",
    sections: [
      { title: "Three guest screens", body: "The guest experience is intentionally useful on its own: describe a screen, inspect the interpretation, edit the filters, and review the matches. An account is only needed when you want to continue and save your work." },
      { title: "No black-box ranking promise", body: "The value of Parse is not a secret AI score. The filters are visible. You can judge whether the screen is sensible based on the actual criteria rather than a generated confidence number." },
      { title: "A focused research tool", body: "Parse currently concentrates on a defined US stock universe and daily-refreshed data. That narrower scope keeps the product focused on making screening easier rather than pretending to be a full brokerage or research terminal." },
    ],
    faq: [
      { q: "Is Parse free to try?", a: "Yes. Visitors can run guest screens without creating an account." },
      { q: "Do I need a credit card?", a: "No credit card is required to try the guest screening experience." },
      { q: "Why would I create an account?", a: "An account is useful when you want to keep screening and save screens for later." },
    ],
  },
  {
    slug: "stock-screener-for-beginners",
    title: "Stock Screener for Beginners",
    description: "A simpler way to start stock screening: describe what you are looking for, then learn from the transparent filters Parse creates.",
    eyebrow: "STOCK SCREENER FOR BEGINNERS",
    headline: "Start with the investing idea, not a wall of filter names.",
    intro: "Stock screeners can feel backwards when you are learning: they ask you to choose from dozens of metrics before you know which metrics express the idea you have in mind. Parse lets you begin in ordinary language and then shows you the structured screen underneath.",
    sections: [
      { title: "Use language you already understand", body: "A beginner can ask for ‘large companies with positive revenue growth and a low P/E’ without first learning the interface conventions of a professional screening terminal." },
      { title: "Learn from the interpretation", body: "Because Parse exposes the filters, it can also help you understand how a qualitative idea maps to measurable criteria. The screen remains something you can question and change." },
      { title: "Screening is not choosing", body: "A stock screen narrows a universe; it does not tell you what to buy. Parse deliberately keeps that distinction visible. Matches are starting points for research, not recommendations." },
    ],
    faq: [
      { q: "Is a stock screener useful for beginners?", a: "It can be useful for narrowing a large universe into a smaller research list, as long as the user understands that a screen is not an investment recommendation." },
      { q: "Do I need to know every financial ratio to use Parse?", a: "No. You can start with ordinary language, then inspect the ratios and thresholds Parse chose." },
      { q: "Can I experiment without saving anything?", a: "Yes. Parse offers a guest experience so you can try several screens first." },
    ],
  },
  {
    slug: "finviz-alternative",
    title: "Finviz Alternative for Natural-Language Screening",
    description: "Looking for a different way to build stock screens? Parse lets you describe the screen in plain English and inspect the filters it creates.",
    eyebrow: "FINVIZ ALTERNATIVE",
    headline: "A different starting point for stock screening: describe the screen first.",
    intro: "Finviz is a well-known stock-screening interface built around selecting filters directly. Parse takes a different approach. It is for moments when you can describe the kind of company you want to find but do not want to manually translate the idea into each screening field before you begin.",
    sections: [
      { title: "Why someone might use Parse instead", body: "If your friction is constructing the screen rather than reading the results, natural language can be faster. Parse turns the request into visible filters and lets you continue editing from there." },
      { title: "What Parse is not trying to replace", body: "Parse is not positioned as a feature-for-feature replacement for a mature market-data platform. Its narrower job is to make the screen-building step more intuitive and transparent." },
      { title: "Use both approaches when they help", body: "Some investors prefer direct filter controls; others think first in sentences. Parse is an alternative interface for the second workflow, and the resulting criteria remain explicit enough to reproduce elsewhere." },
    ],
    faq: [
      { q: "Is Parse affiliated with Finviz?", a: "No. Parse is an independent product and is not affiliated with Finviz." },
      { q: "Does Parse replace every Finviz feature?", a: "No. Parse focuses on natural-language stock screening and transparent filter construction rather than trying to duplicate every feature of a mature market-data platform." },
      { q: "What is the main difference?", a: "Parse starts from a plain-English description and translates it into editable filters; traditional screeners generally start from manual filter selection." },
    ],
  },
  {
    slug: "tradingview-screener-alternative",
    title: "TradingView Screener Alternative for Plain-English Screens",
    description: "Build stock screens from plain-English requests with Parse, then inspect and edit the resulting filters.",
    eyebrow: "TRADINGVIEW SCREENER ALTERNATIVE",
    headline: "When you want to describe the screen before configuring it.",
    intro: "TradingView offers extensive charting and market tools, including screening. Parse is intentionally much narrower. It focuses on one problem: translating an investing idea written in plain English into transparent screening criteria you can inspect and modify.",
    sections: [
      { title: "A language-first workflow", body: "Instead of beginning with a filter panel, begin with a request such as ‘large caps near their highs with strong momentum.’ Parse creates the structured version of that idea." },
      { title: "Transparent by design", body: "The model is not the final authority. You see the metrics, operators, and thresholds it inferred. If the interpretation is wrong, change it rather than trusting a generated answer." },
      { title: "Focused rather than all-in-one", body: "Parse does not try to be a charting suite, broker, social network, or full market terminal. It is useful when the bottleneck is simply getting from an idea to a repeatable stock screen." },
    ],
    faq: [
      { q: "Is Parse affiliated with TradingView?", a: "No. Parse is an independent product and is not affiliated with TradingView." },
      { q: "Does Parse include TradingView charting features?", a: "No. Parse is focused on natural-language screening rather than full charting and trading functionality." },
      { q: "Who is Parse for?", a: "Parse is useful for investors who prefer to describe screening ideas in ordinary language and then work with the explicit filters that result." },
    ],
  },
];

export function getMarketingPage(slug: string) {
  return MARKETING_PAGES.find((page) => page.slug === slug);
}
