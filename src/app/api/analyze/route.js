import { chat, config, OpenRouterError, parseJson } from "@/lib/openrouter";
import { analysisMessages, validateAnalysis } from "@/lib/ai-grading";
import { splitSentences } from "@/lib/engine";
import { LEVELS, getTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";

// POST { topicId, text } -> { analysis } (same shape as engine.analyze) | { error, fallback:true }
export async function POST(req) {
  try {
    const { topicId, text, level } = await req.json();
    const topic = getTopic(topicId);
    const clean = String(text ?? "").slice(0, 4000);
    if (!topic || !clean.trim()) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    const messages = analysisMessages(topic, splitSentences(clean), LEVELS[level]);

    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await chat({ model: config().writingModel, messages, temperature: 0, max_tokens: 1800, json: true });
      const analysis = validateAnalysis(topic, clean, parseJson(reply));
      if (analysis) return Response.json({ analysis, model: config().writingModel });
    }
    return Response.json({ error: "La IA devolvió un análisis inválido.", fallback: true }, { status: 502 });
  } catch (e) {
    if (e instanceof OpenRouterError) return Response.json({ error: e.message, fallback: true }, { status: e.status });
    return Response.json({ error: "No pude analizar con IA.", fallback: true }, { status: 500 });
  }
}
