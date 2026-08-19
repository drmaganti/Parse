// Provider-agnostic completion. The parse step is the only LLM call in the
// product, so this stays deliberately small. Switching Groq -> Google is one
// env var (LLM_PROVIDER); no framework, no orchestration.

type Provider = "groq" | "google";

const PROVIDER = (process.env.LLM_PROVIDER ?? "groq") as Provider;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const GOOGLE_MODEL = process.env.GOOGLE_MODEL ?? "gemini-2.0-flash";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REQUEST_TIMEOUT_MS = 30000;

export interface Completion {
  system: string;
  user: string;
}

export async function complete({ system, user }: Completion): Promise<string> {
  if (PROVIDER === "google") return google(system, user);
  return groq(system, user);
}

function retryDelayMs(res: Response, body: string, attempt: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.ceil(retryAfter * 1000) + 250;
  const match = body.match(/try again in\s+([\d.]+)s/i);
  if (match) return Math.ceil(Number(match[1]) * 1000) + 250;
  return Math.min(15000, 2000 * (attempt + 1));
}

async function groq(system: string, user: string): Promise<string> {
  const key = requireEnv("GROQ_API_KEY");
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0,
          reasoning_effort: "low",
          reasoning_format: "hidden",
          max_completion_tokens: 1024,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch (error) {
      if (attempt < 3 && (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))) {
        await sleep(Math.min(5000, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }

    const body = await res.text();
    if (res.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(res, body, attempt));
      continue;
    }
    throw new Error(`Groq ${res.status}: ${body}`);
  }
  throw new Error("Groq request exhausted retry budget");
}

async function google(system: string, user: string): Promise<string> {
  const key = requireEnv("GOOGLE_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
