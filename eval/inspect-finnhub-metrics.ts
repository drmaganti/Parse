const token = process.env.FINNHUB_API_KEY;
if (!token) throw new Error("FINNHUB_API_KEY missing");

const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all&token=${token}`);
if (!response.ok) throw new Error(`Finnhub metric probe failed: ${response.status}`);
const body = await response.json() as any;
const metric = body?.metric ?? {};
const annual = body?.series?.annual ?? {};
const quarterly = body?.series?.quarterly ?? {};
const wanted = /roe|return.*equity|gross.*margin|payout|dividend.*growth|current.*ratio|quick.*ratio|net.*debt|debt.*ebitda|peg|forward.*p.?e|share.*out|buyback|insider/i;
const pick = (obj: Record<string, unknown>) => Object.fromEntries(Object.entries(obj).filter(([key]) => wanted.test(key)));
console.log("FINNHUB_METRIC_KEYS", JSON.stringify(pick(metric)));
console.log("FINNHUB_ANNUAL_KEYS", JSON.stringify(Object.keys(pick(annual))));
console.log("FINNHUB_QUARTERLY_KEYS", JSON.stringify(Object.keys(pick(quarterly))));
