// Provider-agnostic completion. The parse step is the only LLM call in the
// product, so this stays deliberately small. Switching Groq -> Google is one
// env var (LLM_PROVIDER); no framework, no orchestration.

type Provider = "groq" | "google";

const PROVIDER = (process.env.LLM_PROVIDER ?? "groq") as Provider;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GOOGLE_MODEL = process.env.GOOGLE_MODEL ?? "gemini-2.0-flash";

export interface Completion {
  system: string;
  user: string;
}

export async function complete({ system, user }: Completion): Promise<string> {
  if (PROVIDER === "google") return google(system, user);
  return groq(system, user);
}

async function groq(system: string, user: string): Promise<string> {
  const key = requireEnv("GROQ_API_KEY");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function google(system: string, user: string): Promise<string> {
  const key = requireEnv("GOOGLE_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
