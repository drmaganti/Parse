// Provider-agnostic completion with a small provider adapter. Business meaning
// remains in the criterion compiler; adapters only translate transport,
// structured-output, and reasoning controls for each provider.

import { adaptForGoogle, type CompletionTask } from "./llm-adapters";

type Provider = "groq" | "google";

const PROVIDER = (process.env.LLM_PROVIDER ?? "groq") as Provider;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
const GOOGLE_MODEL = process.env.GOOGLE_MODEL ?? "gemini-3.6-flash";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRY_DELAY_MS = 30000;

export interface Completion {
  system: string;
  user: string;
  task?: CompletionTask;
}

export async function complete({ system, user, task = "generic_json" }: Completion): Promise<string> {
  if (PROVIDER === "google") return google({ system, user, task });
  return groq(system, user);
}

function retryDelayMs(res: Response, body: string, attempt: number): number {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(MAX_RETRY_DELAY_MS, Math.ceil(retryAfter * 1000) + 250);
  const match = body.match(/try again in\s+([\d.]+)s/i);
  if (match) return Math.min(MAX_RETRY_DELAY_MS, Math.ceil(Number(match[1]) * 1000) + 250);
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
          reasoning_effort: "medium",
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
    if (res.status === 400) {
      try {
        const failed = JSON.parse(body)?.error?.failed_generation;
        if (typeof failed === "string" && failed.trim()) return failed;
      } catch {
        // Fall through to the normal provider error when no usable generation exists.
      }
    }
    if (res.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(res, body, attempt));
      continue;
    }
    throw new Error(`Groq ${res.status}: ${body}`);
  }
  throw new Error("Groq request exhausted retry budget");
}

async function google(input: Completion): Promise<string> {
  const key = requireEnv("GOOGLE_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify(adaptForGoogle(input, GOOGLE_MODEL)),
      });
    } catch (error) {
      if (attempt < 3 && error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        await sleep(Math.min(5000, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
    }
    const body = await res.text();
    if (res.status === 429 && attempt < 3) {
      await sleep(retryDelayMs(res, body, attempt));
      continue;
    }
    throw new Error(`Google ${res.status}: ${body}`);
  }
  throw new Error("Google request exhausted retry budget");
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
