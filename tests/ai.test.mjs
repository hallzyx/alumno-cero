// Tests for checking AI replies (no model needed): the replies below imitate what the small in-browser
// model (Qwen2.5-1.5B via WebGPU) really writes, and every check must still block invented quotes and figures.
import test from "node:test";
import assert from "node:assert/strict";
import { getTopic } from "../src/lib/topics.js";
import { locateQuote, validateAnalysis, validateNarration } from "../src/lib/ai-grading.js";
import { readAnalysis } from "../src/lib/ai-client.js";
import { parseJsonObjects } from "../src/lib/json.js";
import { analyze, splitSentences } from "../src/lib/engine.js";

const compound = getTopic("interes-compuesto");
const MODEL = compound.modelExplanation;
const PARA = "Mira, el banco te da un % de lo que tienes guardado cada año. El segundo año ese % lo sacas de todo lo que ya juntaste, o sea lo que pusiste mas lo que ganaste. Y asi año tras año, por eso crece mas y mas rapido.";
const BAD = "El interés es un porcentaje que te dan cada año. Siempre se calcula sobre lo que depositaste al inicio, así que cada año ganas lo mismo. Por ejemplo con S/ 1000 al 10% ganas 100 cada año.";

test("quotes: located by their words, whatever the casing, accents, '[n]' prefix or sentence number", () => {
  const s = splitSentences(MODEL);
  assert.equal(locateQuote(s, "[3] cada ano el INTERES se calcula sobre el saldo acumulado"), 2);
  assert.equal(locateQuote(s, "Cada año el interés se calcula sobre el saldo acumulado", 0), 2); // wrong hint ignored
  assert.equal(locateQuote(s, "«Por ejemplo, 10% anual» … ganar S/ 10"), 1); // ellipsis: each piece is real
  // a quote running over two sentences ("tiempo: es interés…") still points at a real one
  assert.ok(locateQuote(s, "el dinero crece más rápido con el tiempo: es interés sobre interés.") >= 0);
});

test("quotes: invented or partial-word citations never pass", () => {
  const s = splitSentences(MODEL);
  assert.equal(locateQuote(s, "Eso se repite en cada periodo, por eso el crecimiento se acelera"), -1);
  assert.equal(locateQuote(s, "res"), -1); // inside "intereses", not a word of its own
  assert.equal(locateQuote(s, ""), -1);
});

test("small model reply: wrong sentence numbers, odd casing and extra fields still verify", () => {
  const raw = { concepts: [
    { id: "RATE", state: "Known ", sentence: 9, quote: "[1] el interes es un porcentaje, una tasa", misconception: "", wrong_claim: "", extra: 1 },
    { id: "base", state: "known", sentence: 1, quote: "se calcula sobre el saldo acumulado", misconception: "", wrong_claim: "" },
    { id: "repeat", state: "known", quote: "Esto se repite cada año", misconception: "", wrong_claim: "" },
  ] };
  const a = validateAnalysis(compound, MODEL, raw, "webgpu", { partial: true });
  assert.deepEqual(a.states, { rate: "known", base: "known", repeat: "known" });
  assert.equal(a.evidence.base.index, 2); // located by the quote, not by the model's "sentence"
  assert.deepEqual(a.log.unverified, []);
});

test("partial replies: skipped or unverifiable ideas are flagged, not fatal (cloud stays strict)", () => {
  const raw = { concepts: [
    { id: "base", state: "known", quote: "el capital más los intereses ya ganados" },
    { id: "repeat", state: "known", quote: "el interés se duplica cada año" }, // not in the text
  ] };
  assert.equal(validateAnalysis(compound, MODEL, raw, "cloud"), null);
  const a = validateAnalysis(compound, MODEL, raw, "webgpu", { partial: true });
  assert.deepEqual(a.log.unverified.sort(), ["rate", "repeat"]);
  assert.equal(a.states.base, "known");
  assert.equal(a.states.repeat, "missing");
});

test("small model says 'known' but names the common error: it counts as that error", () => {
  const raw = { concepts: [{ id: "base", state: "known", quote: "Siempre se calcula sobre lo que depositaste al inicio", misconception: "solo-inicial", wrong_claim: "" }] };
  const a = validateAnalysis(compound, BAD, raw, "webgpu", { partial: true });
  assert.equal(a.states.base, "wrong");
  assert.equal(a.evidence.base.misconception.id, "solo-inicial");
});

test("truncated reply: the finished items are recovered", () => {
  const cut = '{"concepts":[{"id":"rate","state":"known","quote":"un porcentaje, una tasa"},{"id":"base","state":"known","quote":"saldo acumulado"},{"id":"repeat","sta';
  const items = parseJsonObjects(cut);
  assert.deepEqual(items.map((o) => o.id), ["rate", "base"]);
  const a = readAnalysis(compound, MODEL, cut);
  assert.equal(a.log.provider, "webgpu");
  assert.equal(a.states.repeat, "known"); // the topic's rules found it in the text
});

test("in-browser analysis: the model decides paraphrases, the topic's rules guard what they can see", () => {
  // Real Qwen2.5-1.5B replies (WebGPU) for these two texts.
  const para = readAnalysis(compound, PARA, '{"concepts":[{"id":"rate","state":"missing","quote":"El banco te da un % de lo que tienes guardado cada año.","misconception":"","wrong_claim":"x"},{"id":"base","state":"known","quote":"El segundo año ese % lo sacas de todo lo que ya juntaste, o sea lo que pusiste mas lo que ganaste.","misconception":"","wrong_claim":""},{"id":"repeat","state":"known","quote":"Eso se repite en cada periodo, por eso el crecimiento se acelera","misconception":"","wrong_claim":""}]}');
  assert.equal(para.states.base, "known"); // the rules alone miss this paraphrase
  assert.equal(para.states.repeat, "known"); // invented quote -> decided by the rules instead
  assert.ok(para.log.fromBasic.includes("repeat"));
  const bad = readAnalysis(compound, BAD, '{"concepts":[{"id":"rate","state":"missing","quote":"El interés es un porcentaje que te dan cada año.","misconception":"","wrong_claim":""},{"id":"base","state":"known","quote":"Siempre se calcula sobre lo que depositaste al inicio, así que cada año ganas lo mismo.","misconception":"solo-inicial","wrong_claim":""},{"id":"repeat","state":"known","quote":"Por ejemplo con S/ 1000 al 10% ganas 100 cada año.","misconception":"una-vez","wrong_claim":""}]}');
  assert.equal(bad.states.base, "wrong");
  assert.equal(compound.solve(compound.variants[0], bad.states).passed, false); // the wrong idea still makes Cero fail
});

test("in-browser analysis: nothing verifiable -> null, so the caller falls back honestly", () => {
  assert.equal(readAnalysis(compound, MODEL, '{"concepts":[{"id":"rate","state":"known","quote":"la tasa es fija por ley"}]}'), null);
  assert.equal(readAnalysis(compound, MODEL, "lo siento, no puedo"), null);
});

test("narration: the solver keeps the numbers; copied, invented or unsafe steps use the solver's words", () => {
  const analysis = analyze(compound, BAD);
  const v = compound.variants[0];
  const ref = compound.solve(v, analysis.states);
  const raw = { steps: [
    { conceptId: "rate", text: "Me enseñaste que el 10% es una parte del dinero que se gana cada año, así que la usé así." },
    { conceptId: "base", text: "Calculé el interés siempre sobre 5000 soles." }, // invented figure
    { conceptId: "repeat", text: "Por ejemplo con S/ 1000 al 10% ganas 100 cada año." }, // copy of the student
  ] };
  const r = validateNarration(compound, v, analysis, raw, ref, BAD, "webgpu");
  assert.ok(r.ok);
  assert.equal(r.exam.provider, "webgpu");
  assert.equal(r.exam.answer, ref.answer);
  assert.match(r.exam.steps[0].text, /Me enseñaste/);
  assert.equal(r.exam.steps[1].text, ref.steps[1].text);
  assert.equal(r.exam.steps[2].text, ref.steps[2].text);
  // nothing usable -> not claimed as AI
  assert.equal(validateNarration(compound, v, analysis, { steps: [{ conceptId: "rate", text: "10% anual" }] }, ref, BAD).ok, false);
});
