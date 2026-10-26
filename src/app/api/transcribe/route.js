import { chat, config, OpenRouterError } from "@/lib/openrouter";

export const dynamic = "force-dynamic";
const MAX_BYTES = 8 * 1024 * 1024;

// POST multipart/form-data { audio: WAV file } -> { text }
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!file || typeof file === "string") return Response.json({ error: "No llegó audio." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "El audio es muy largo. Dicta en tramos más cortos." }, { status: 413 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const text = await chat({
      model: config().voiceModel,
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe literalmente este audio en español. Devuelve SOLO la transcripción, sin comentarios, comillas ni formato." },
            { type: "input_audio", input_audio: { data, format: "wav" } },
          ],
        },
      ],
    });
    return Response.json({ text });
  } catch (e) {
    if (e instanceof OpenRouterError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "No pude transcribir el audio." }, { status: 500 });
  }
}
