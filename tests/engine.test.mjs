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

test("math topics write notebook work; the corrected page ends in the expected answer", async () => {
  const { correctWork } = await import("../src/lib/engine.js");
  for (const id of ["interes-compuesto", "descuentos-sucesivos", "regla-de-tres"]) {
    const t = getTopic(id);
    const v = t.variants[0];
    const good = correctWork(t, v);
    assert.ok(good.length >= 2, id);
    assert.ok(good.every((l) => l.ok), id);
    assert.equal(good.at(-1).exprs[0].replace(/[^\d.]/g, ""), String(v.expected).replace(/[^\d.]/g, ""), id);
    const bad = takeExam(t, v, analyze(t, "x")); // nothing taught: Cero guesses
    assert.ok(bad.work.some((l) => l.ok === false), id);
  }
  assert.equal(correctWork(getTopic("fotosintesis"), getTopic("fotosintesis").variants[0]), null);
});

test("demo 'wrong idea' exists for every topic and really makes Cero fail with a blamed sentence", async () => {
  const { DEMO_BAD } = await import("../src/lib/demo.js");
  for (const t of TOPICS) {
    const text = DEMO_BAD[t.id];
    assert.ok(text, `missing demo for ${t.id}`);
    assert.equal(validateExplanation(t, text).ok, true, t.id);
    const a = analyze(t, text);
    const exam = takeExam(t, pickVariant(t, "companero", 0), a);
    assert.equal(exam.passed, false, t.id);
    assert.ok(exam.blame?.sentence, `${t.id}: blamed sentence`);
  }
});

test("late sign-up: anonymous progress becomes state + attempt/mastered events", async () => {
  const { buildMigration, hasProgress, mergeRewards, progressSummary } = await import("../src/lib/migrate.js");
  const sid = "11111111-2222-4333-8444-555555555555";
  assert.equal(buildMigration({ topicId: null, history: [] }, () => sid), null);
  assert.equal(hasProgress({ topicId: "fotosintesis", history: [], text: "  " }), false);
  const exam = { variantId: "b", passed: true };
  const state = {
    topicId: "fotosintesis", sid: "not-a-uuid", text: "texto final", analysis: { states: {} }, exam,
    history: [{ attempt: 1, passed: false, variantId: "a" }, { attempt: 2, passed: true, variantId: "b" }],
    mastered: { text: "texto final", concepts: ["luz"], at: 1 },
  };
  const plan = buildMigration(state, () => sid);
  assert.equal(plan.sid, sid);
  assert.equal(plan.snapshot.sid, sid);
  assert.deepEqual(plan.events.map((e) => e.type), ["attempt", "attempt", "mastered"]);
  assert.equal(plan.events[0].payload.exam, null);
  assert.equal(plan.events[0].payload.passed, false);
  assert.equal(plan.events[1].payload.attemptNo, 2);
  assert.equal(plan.events[1].payload.exam, exam);
  assert.equal(plan.events[1].payload.explanation, "texto final");
  assert.equal(plan.events[2].payload.attempts, 2);
  assert.match(progressSummary(state, "Fotosíntesis"), /ficha de dominio y 2 exámenes/);
  const merged = mergeRewards([
    { gained: 10, lines: [{ label: "Examen hecho", xp: 10 }], level: { n: 1 }, levelUp: false, newBadges: [] },
    null,
    { gained: 30, lines: [{ label: "Examen hecho", xp: 10 }, { label: "¡Cero aprobó!", xp: 20 }], level: { n: 2 }, levelUp: true, newBadges: [{ code: "aprobe" }] },
  ]);
  assert.equal(merged.gained, 40);
  assert.deepEqual(merged.lines, [{ label: "Examen hecho", xp: 20 }, { label: "¡Cero aprobó!", xp: 20 }]);
  assert.equal(merged.level.n, 2);
  assert.equal(merged.levelUp, true);
  assert.equal(merged.newBadges.length, 1);
});
