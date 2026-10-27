// Browser-side AI providers. Order of preference (see AlumnoCero.jsx):
//   cloud (OpenRouter, paid plans, online)  ->  webgpu (in the browser)  ->  basic (deterministic engine).
// Every provider goes through the SAME validation (verbatim quotes, safe text, solver-verified answers).
import { analysisMessages, examMessages, sanitizeAnalysis, validateAnalysis, validateExam } from "./ai-grading.js";
import { splitSentences } from "./engine.js";
import { parseJson } from "./json.js";
import { LEVELS } from "./topics.js";
import { chatJson, reportUnverified } from "./webllm.js";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          state: { enum: ["known", "wrong", "missing"] },
          sentence: { type: "integer" },
          quote: { type: "string" },
          misconception: { type: "string" },
          wrong_claim: { type: "string" },
        },
        required: ["id", "state", "sentence", "quote", "misconception", "wrong_claim"],
      },
    },
  },
  required: ["concepts"],
};

const EXAM_SCHEMA = {
  type: "object",
  properties: {
    steps: { type: "array", items: { type: "object", properties: { conceptId: { type: "string" }, text: { type: "string" } }, required: ["conceptId", "text"] } },
    calc: { type: "array", items: { type: "object", properties: { label: { type: "string" }, detail: { type: "string" }, total: { type: "string" } }, required: ["label", "detail", "total"] } },
    answer: { type: "string" },
  },
  required: ["steps", "calc", "answer"],
};

/** Analysis with the in-browser model. Returns a validated analysis or null (caller falls back). */
export async function webgpuAnalysis(topic, text, levelId) {
  const messages = analysisMessages(topic, splitSentences(text), LEVELS[levelId], { compact: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chatJson(messages, { schema: ANALYSIS_SCHEMA, max_tokens: 700 });
    const analysis = validateAnalysis(topic, text, parseJson(reply), "webgpu");
    if (analysis) return analysis;
    console.warn("[webgpu] respuesta de análisis no verificable:", reply);
  }
  reportUnverified();
  return null;
}

/** Exam with the in-browser model. Returns a validated exam or null. The solver verifies the answer. */
export async function webgpuExam(topic, variant, analysis, text) {
  const clean = sanitizeAnalysis(topic, analysis);
  const ref = topic.solve(variant, clean.states);
  let feedback = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await chatJson(examMessages(topic, variant, clean, text, ref, feedback), { schema: EXAM_SCHEMA, max_tokens: 900 });
    const check = validateExam(topic, variant, clean, parseJson(reply), ref, "webgpu");
    if (check.ok) return check.exam;
    feedback = check.reason;
  }
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
