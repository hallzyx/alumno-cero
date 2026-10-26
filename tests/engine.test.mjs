import test from "node:test";
import assert from "node:assert/strict";
import { TOPICS, getTopic } from "../src/lib/topics.js";
import { analyze, validateExplanation, takeExam, pickVariant } from "../src/lib/engine.js";

const compound = getTopic("interes-compuesto");

test("validation: empty, short, off-topic", () => {
  assert.equal(validateExplanation(compound, "").code, "empty");
  assert.equal(validateExplanation(compound, "el interes sube").code, "short");
  assert.equal(
    validateExplanation(compound, "Las plantas necesitan agua y luz del sol para poder crecer bien en el jardin todos los dias").code,
    "off-topic"
  );
});

test("model explanation passes every variant for every topic", () => {
  for (const t of TOPICS) {
    assert.equal(validateExplanation(t, t.modelExplanation).ok, true, t.id);
    const a = analyze(t, t.modelExplanation);
    for (const c of t.concepts) assert.equal(a.states[c.id], "known", `${t.id}/${c.id}`);
    for (const v of t.variants) assert.equal(takeExam(t, v, a).passed, true, `${t.id}/${v.id}`);
  }
});

test("wow moment: the 'lo que pedí' misconception fails and blames the sentence", () => {
  const text =
    "El banco te presta dinero y cobra una tasa de 10% anual. El interés se calcula sobre lo que pediste. Eso se repite cada año durante el plazo.";
  const a = analyze(compound, text);
  assert.equal(a.states.base, "wrong");
  const r = takeExam(compound, compound.variants[0], a);
  assert.equal(r.passed, false);
  assert.equal(r.blame.conceptId, "base");
  assert.match(r.blame.sentence, /lo que pediste/);
});

test("later correction wins over earlier misconception", () => {
  const text =
    "La tasa de 10% anual se aplica cada año. Al inicio el interés se calcula sobre lo que pediste. Pero corrijo: el interés se calcula sobre el saldo acumulado, con los intereses ya ganados.";
  const a = analyze(compound, text);
  assert.equal(a.states.base, "known");
});

test("missing concept yields a gap, not a crash", () => {
  const a = analyze(compound, "El interés es lo que te cobra el banco por prestarte plata durante un tiempo largo.");
  const r = takeExam(compound, pickVariant(compound, "companero", 0), a);
  assert.equal(r.passed, false);
  assert.ok(r.blame.message.length > 10);
});

test("discounts: additive misconception fails, model passes", () => {
  const t = getTopic("descuentos-sucesivos");
  const bad = analyze(t, "Un descuento es un porcentaje que se resta del precio. Si hay dos descuentos, los porcentajes se suman y es un solo descuento sobre el precio original.");
  assert.equal(bad.states.second, "wrong");
  assert.equal(takeExam(t, t.variants[0], bad).passed, false);
});

test("accents and punctuation do not matter", () => {
  const a = analyze(compound, "TASA: 10% ANUAL!!! El INTERÉS se calcula sobre el SALDO ACUMULADO, cada AÑO se repite.");
  assert.equal(a.states.base, "known");
  assert.equal(a.states.repeat, "known");
});

test("regla de tres: sumar la diferencia falla y se señala; el modelo aprueba", () => {
  const t = getTopic("regla-de-tres");
  const bad = "Si 3 cuadernos cuestan 12, para 7 se suma la misma cantidad que falta. Se le suma la diferencia al precio.";
  const exam = takeExam(t, t.variants[0], analyze(t, bad));
  assert.equal(exam.passed, false);
  assert.equal(exam.blame.conceptId, "ratio");
  const ok = takeExam(t, t.variants[0], analyze(t, t.modelExplanation));
  assert.equal(ok.passed, true);
  assert.equal(ok.answerText, "S/ 28.00");
});

test("ciclo del agua: 'desaparece' falla y se señala la frase", () => {
  const t = getTopic("ciclo-del-agua");
  const a = analyze(t, "Cuando el sol calienta un charco el agua desaparece y deja de existir. Las nubes sueltan lluvia cuando las gotas pesan.");
  const exam = takeExam(t, t.variants[0], a);
  assert.equal(exam.passed, false);
  assert.match(exam.blame.sentence, /desaparece/);
});

test("every topic declares a subject and has resources", async () => {
  const { RESOURCES } = await import("../src/lib/resources.js");
  for (const t of TOPICS) {
    assert.ok(["matematica", "ciencias"].includes(t.subject), t.id);
    assert.ok(RESOURCES[t.id]?.glossary.length, t.id);
  }
});
