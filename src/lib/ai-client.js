// Browser-side AI providers. Order of preference (see AlumnoCero.jsx):
//   cloud (OpenRouter, paid plans, online)  ->  webgpu (in the browser)  ->  basic (deterministic engine).
// Every provider goes through the SAME validation (verbatim quotes, safe text, solver-verified answers).
import { analysisMessages, narrationMessages, sanitizeAnalysis, validateAnalysis, validateNarration } from "./ai-grading.js";
import { analyze, splitSentences } from "./engine.js";
import { parseJson, parseJsonObjects } from "./json.js";
import { LEVELS } from "./topics.js";
import { chatJson, reportUnverified } from "./webllm.js";

// Per-topic grammars (EBNF) instead of a JSON Schema. With a schema, WebLLM allows any amount of whitespace
// between tokens, and the 1.5B model can fall into writing nothing but newlines until max_tokens (seen live:
// regla de tres). Here the JSON is compact and fixed: one object per idea, in order, with the idea's id and its
// own error ids written into the grammar, so the model can neither skip an idea nor name one that doesn't exist.
// No sentence numbers either: we locate each quote in the text ourselves.
const lit = (s) => JSON.stringify(JSON.stringify(s)); // EBNF literal for the JSON text of s
const STR = String.raw`str ::= "\"" ([^"\\\r\n] | "\\" ["\\/nt])* "\""`;
const objects = (key, rules) => `root ::= "{" ${lit(key)} ":[" ${rules.map((_, i) => `o${i}`).join(' "," ')} "]}"\n${rules.map((r, i) => `o${i} ::= "{" ${r} "}"`).join("\n")}\n${STR}`;
const field = (name, value) => `${lit(name)} ":" ${value}`;

export function analysisGrammar(topic) {
  return objects("concepts", topic.concepts.map((c) => [
    field("id", lit(c.id)),
    field("state", `(${["known", "wrong", "missing"].map(lit).join(" | ")})`),
    field("quote", "str"),
    field("misconception", `(${["", "otro", ...(c.misconceptions ?? []).map((m) => m.id)].map(lit).join(" | ")})`),
    field("wrong_claim", "str"),
  ].join(' "," ')));
}

export const narrationGrammar = (ref) => objects("steps", ref.steps.map((s) => `${field("conceptId", lit(s.conceptId))} "," ${field("text", "str")}`));

const WHY = { abort: "tardó demasiado en responder", length: "su respuesta quedó cortada" };

/** The reply as JSON, or the complete items of a reply that was cut off. */
function readJson(content, key, isItem) {
  const whole = parseJson(content);
  if (Array.isArray(whole?.[key])) return whole;
  return { [key]: parseJsonObjects(content).filter(isItem) };
}

/**
 * Model verdicts, checked like the cloud's, combined per idea with the topic's own rules. A 1.5B model is
 * lenient (it called "siempre sobre lo que depositaste" known) and often misses ideas, so where the rules find
 * the idea in the text (stated right or as a known error) they decide; everywhere else (paraphrases, informal
 * wording the rules can't see) the model decides. Null when nothing the model said could be verified.
 */
export function readAnalysis(topic, text, content) {
  const raw = readJson(content, "concepts", (o) => typeof o?.id === "string" && "state" in o);
  const analysis = validateAnalysis(topic, text, raw, "webgpu", { partial: true });
  if (!analysis || analysis.log.unverified.length === topic.concepts.length) return null;
  const basic = analyze(topic, text);
  const fromBasic = topic.concepts
    .map((c) => c.id)
    .filter((id) => basic.states[id] !== "missing" || analysis.log.unverified.includes(id));
  for (const id of fromBasic) {
    analysis.states[id] = basic.states[id];
    analysis.evidence[id] = basic.evidence[id];
    if (basic.states[id] !== "missing") delete analysis.gaps[id];
  }
  analysis.log = { ...analysis.log, fromBasic, matched: Object.values(analysis.evidence).filter(Boolean).length };
  return analysis;
}

/**
 * Analysis with the in-browser model. Returns a validated analysis or null (caller falls back; the reason is in
 * the WebGPU store's lastError). A lost GPU gets one retry (the engine reloads); a bad reply gets one retry with
 * a correction, since at temperature 0 the same prompt would give the same answer.
 */
export async function webgpuAnalysis(topic, text, levelId) {
  const messages = analysisMessages(topic, splitSentences(text), LEVELS[levelId], { compact: true });
  const grammar = analysisGrammar(topic);
  let why = "su respuesta no pasó la verificación de citas";
  for (let attempt = 0; attempt < 2; attempt++) {
    let reply;
    try { reply = await chatJson(messages, { grammar, max_tokens: 1000 }); } catch (e) { if (attempt) throw e; continue; }
    const analysis = readAnalysis(topic, text, reply.content);
    if (analysis) return analysis;
    why = WHY[reply.finish] ?? why;
    console.warn("[webgpu] respuesta de análisis no verificable:", reply.finish, reply.content);
    messages.push(
      { role: "assistant", content: reply.content.slice(0, 1500) },
      { role: "user", content: "No pude verificar tu respuesta. En \"quote\" copia palabras EXACTAS del estudiante (sin números de frase). Responde de nuevo con el mismo formato." },
    );
  }
  reportUnverified(why);
  return null;
}

/** Exam with the in-browser model: it narrates Cero's steps, the solver fixes the numbers. Returns an exam or null. */
export async function webgpuExam(topic, variant, analysis, text) {
  const clean = sanitizeAnalysis(topic, analysis);
  const ref = topic.solve(variant, clean.states);
  const messages = narrationMessages(topic, variant, clean, ref);
  let why = "su razonamiento no se pudo verificar";
  for (let attempt = 0; attempt < 2; attempt++) {
    let reply;
    try { reply = await chatJson(messages, { grammar: narrationGrammar(ref), max_tokens: 700 }); } catch (e) { if (attempt) throw e; continue; }
    const check = validateNarration(topic, variant, clean, readJson(reply.content, "steps", (o) => typeof o?.conceptId === "string"), ref, text, "webgpu");
    if (check.ok) return check.exam;
    why = WHY[reply.finish] ?? why;
    console.warn("[webgpu] razonamiento no verificable:", check.reason, reply.content);
    messages.push(
      { role: "assistant", content: reply.content.slice(0, 1500) },
      { role: "user", content: "No copies el texto del estudiante ni el nombre de la idea: para cada conceptId cuenta con tus palabras, en primera persona, lo que hiciste («lo que hice») y por qué. Responde de nuevo con el mismo formato." },
    );
  }
  reportUnverified(why);
  return null;
}

/** Same calls as the server routes, for paid plans. Throws on network/HTTP problems so the caller can fall back. */
export async function cloudAnalysis(topicId, text, level, signal) {
  const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, text, level }), signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.analysis) throw Object.assign(new Error(j.error || "La IA en la nube no respondió."), { status: r.status });
  return { ...j.analysis, log: { ...j.analysis.log, provider: "cloud" } };
}

export async function cloudExam(topicId, variantId, text, analysis, signal) {
  const r = await fetch("/api/exam", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, variantId, text, analysis }), signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.exam) throw Object.assign(new Error(j.error || "La IA en la nube no respondió."), { status: r.status });
  return { ...j.exam, provider: "cloud" };
}
