import { chat, config, OpenRouterError } from "@/lib/openrouter";
import { requireCloudAI } from "@/lib/learner";

export const dynamic = "force-dynamic";

const SYSTEM = `Eres Cero, una IA curiosa que NO sabe nada del tema. Solo conoces lo que el estudiante escribió en su explicación.
Responde en español, en primera persona, con tono cercano y breve (máximo 110 palabras, sin listas largas).
Haz tres cosas: (1) di con tus palabras lo que entendiste, citando una frase del estudiante entre «», (2) señala con curiosidad ingenua una cosa que no te quedó clara o que suena contradictoria, (3) formula una pregunta que lo haga explicar mejor.
Nunca corrijas con información externa ni des la respuesta correcta: si la explicación tiene un error, repítelo como si fuera cierto y pregunta por sus consecuencias.`;

// POST { topic, level, text } -> { text }
export async function POST(req) {
  const gate = await requireCloudAI();
  if (gate.error) return gate.error;
  try {
    const { topic, level, text } = await req.json();
    const explanation = String(text ?? "").slice(0, 4000);
    if (explanation.trim().split(/\s+/).length < 8) return Response.json({ error: "Escribe un poco más para que Cero pueda leerte." }, { status: 400 });
    const reply = await chat({
      model: config().writingModel,
      temperature: 0.6,
      max_tokens: 450,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Tema: ${String(topic ?? "").slice(0, 120)}\nPersonalidad de Cero: ${String(level ?? "").slice(0, 40)}\n\nExplicación del estudiante:\n"""\n${explanation}\n"""` },
      ],
    });
    return Response.json({ text: reply });
  } catch (e) {
    if (e instanceof OpenRouterError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Cero no pudo responder ahora." }, { status: 500 });
  }
}
