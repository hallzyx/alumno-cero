import { chat, config, OpenRouterError, parseJson } from "@/lib/openrouter";
import { examMessages, sanitizeAnalysis, validateExam } from "@/lib/ai-grading";
import { getTopic } from "@/lib/topics";
import { requireCloudAI } from "@/lib/learner";

export const dynamic = "force-dynamic";

// POST { topicId, variantId, text, analysis } -> { exam } | { error, fallback:true }
// The model never sees the expected answer; the topic solver verifies what it returns.
export async function POST(req) {
  const gate = await requireCloudAI();
  if (gate.error) return gate.error;
  try {
    const body = await req.json();
    const topic = getTopic(body.topicId);
    const variant = topic?.variants.find((v) => v.id === body.variantId);
    if (!topic || !variant || !body.analysis) return Response.json({ error: "Solicitud inválida." }, { status: 400 });

    const analysis = sanitizeAnalysis(topic, body.analysis);
    const text = String(body.text ?? "").slice(0, 4000);
    const ref = topic.solve(variant, analysis.states);

    let feedback = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await chat({ model: config().writingModel, messages: examMessages(topic, variant, analysis, text, ref, feedback), temperature: 0, max_tokens: 1100, json: true });
      const check = validateExam(topic, variant, analysis, parseJson(reply), ref);
      if (check.ok) return Response.json({ exam: check.exam, model: config().writingModel });
      feedback = check.reason;
    }
    return Response.json({ error: "La IA no logró un razonamiento verificable.", fallback: true }, { status: 502 });
  } catch (e) {
    if (e instanceof OpenRouterError) return Response.json({ error: e.message, fallback: true }, { status: e.status });
    return Response.json({ error: "No pude resolver el examen con IA.", fallback: true }, { status: 500 });
  }
}
