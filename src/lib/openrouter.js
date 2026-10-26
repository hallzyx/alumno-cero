// Server-only OpenRouter client. The API key never leaves the server.
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const config = () => ({
  key: process.env.OPENROUTER_API_KEY?.trim() || "",
  voiceModel: process.env.OPENROUTER_VOICE_MODEL?.trim() || "google/gemini-2.5-flash",
  writingModel: process.env.OPENROUTER_WRITING_MODEL?.trim() || "anthropic/claude-sonnet-4.5",
});

export class OpenRouterError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

/** Extract the first JSON object from a model reply (tolerates code fences / chatter). */
export function parseJson(text) {
  const raw = String(text ?? "").replace(/```(?:json)?/gi, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

export async function chat({ model, messages, temperature = 0.4, max_tokens = 600, json = false }) {
  const { key } = config();
  if (!key) throw new OpenRouterError("Falta OPENROUTER_API_KEY en el archivo .env.", 503);
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME || "Alumno Cero",
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, ...(json ? { response_format: { type: "json_object" } } : {}) }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new OpenRouterError("No pude conectar con OpenRouter.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new OpenRouterError(data?.error?.message ?? `OpenRouter respondió ${res.status}.`, res.status === 401 ? 401 : 502);
  const content = data?.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map((p) => p.text ?? "").join("") : content;
  if (!text?.trim()) throw new OpenRouterError("OpenRouter devolvió una respuesta vacía.");
  return text.trim();
}
