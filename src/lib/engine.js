// Alumno Cero — teaching engine.
// Cero only "knows" what the learner wrote. This module reads an explanation,
// detects which concepts were stated (or misstated), and lets Cero attempt a
// transfer problem using ONLY those ideas. Pure functions, no DOM: runs in the
// browser and in Node (see tests/).

/** Lowercase, strip accents, keep letters/digits/% and pad with spaces so that
 *  alternatives like " ano " match whole words. */
export function normalize(text) {
  const base = String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%+]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  return ` ${base} `;
}

/** Split an explanation into sentences, keeping the original text. */
export function splitSentences(text) {
  return String(text ?? "")
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, "").length >= 3);
}

/** A pattern is a list of groups; every group needs at least one alternative
 *  to appear (as a substring) in the normalized sentence. */
export function matchesPattern(normSentence, pattern) {
  return pattern.every((group) => group.some((alt) => normSentence.includes(alt)));
}

const anyPattern = (norm, patterns = []) => patterns.some((p) => matchesPattern(norm, p));

/**
 * Validate an explanation before spending Cero's attention on it.
 * Returns { ok: true } or { ok: false, code, message }.
 */
export function validateExplanation(topic, text) {
  const raw = String(text ?? "").trim();
  if (!raw) {
    return { ok: false, code: "empty", message: "Todavía no me has explicado nada. Escribe (o dicta) con tus palabras cómo funciona." };
  }
  const words = normalize(raw).trim().split(" ").filter(Boolean);
  if (words.length < 12) {
    return {
      ok: false,
      code: "short",
      message: `Me quedé con ganas de más: solo entendí ${words.length} palabra${words.length === 1 ? "" : "s"}. Cuéntame con al menos dos o tres frases cómo funciona, como si yo no supiera nada.`,
    };
  }
  const norm = normalize(raw);
  const onTopic = topic.keywords.some((k) => norm.includes(k));
  if (!onTopic) {
    return {
      ok: false,
      code: "off-topic",
      message: `No logro conectar lo que escribiste con «${topic.title}». ¿Seguro que es sobre ese tema? Si quieres, vuelve a la lista y elige otro.`,
    };
  }
  const distinct = new Set(words).size / words.length;
  if (distinct < 0.35) {
    return { ok: false, code: "repetitive", message: "Veo muchas palabras repetidas y pocas ideas. Intenta explicarlo con frases distintas." };
  }
  return { ok: true };
}

/**
 * Read the explanation. For each concept the state is:
 *  - "known":   a sentence states it correctly
 *  - "wrong":   a sentence states a known misconception (and no later correct one)
 *  - "missing": never mentioned
 * When both appear, the LATER sentence wins (the learner corrected themselves).
 */
export function analyze(topic, text) {
  const sentences = splitSentences(text);
  const states = {};
  const evidence = {};
  const log = { sentences: sentences.length, matched: 0 };

  for (const concept of topic.concepts) {
    let last = null; // { index, kind, sentence, misconception? }
    sentences.forEach((sentence, index) => {
      const norm = normalize(sentence);
      if (anyPattern(norm, concept.correct)) {
        last = { index, kind: "known", sentence };
        return;
      }
      for (const m of concept.misconceptions ?? []) {
        if (anyPattern(norm, m.patterns)) {
          last = { index, kind: "wrong", sentence, misconception: m };
          return;
        }
      }
    });
    states[concept.id] = last ? last.kind : "missing";
    evidence[concept.id] = last;
    if (last) log.matched += 1;
  }
  return { states, evidence, sentences, log };
}

/** What Cero says he understood, quoting the learner. */
export function reflect(topic, analysis) {
  return topic.concepts.map((c) => {
    const ev = analysis.evidence[c.id];
    const state = analysis.states[c.id];
    return {
      conceptId: c.id,
      state,
      understood: state === "known" ? c.understood : state === "wrong" ? ev.misconception.cero : null,
      quote: ev ? ev.sentence : null,
    };
  });
}

/** Naive questions Cero asks about what is missing or shaky, by level. */
export function questionsFor(topic, analysis, level = "companero", max = 2) {
  const out = [];
  for (const c of topic.concepts) {
    if (analysis.states[c.id] === "known") continue;
    out.push({ conceptId: c.id, text: c.ask[level] ?? c.ask.companero });
  }
  return out.slice(0, max);
}

/** Pick the exam variant for this attempt. Never repeats until all are used. */
export function pickVariant(topic, level, attemptIndex) {
  const order = topic.variantOrder[level] ?? topic.variantOrder.companero;
  const id = order[attemptIndex % order.length];
  return topic.variants.find((v) => v.id === id);
}

/** Cero takes the transfer exam using only what the learner taught. */
export function takeExam(topic, variant, analysis) {
  const result = topic.solve(variant, analysis.states);
  const firstBad = result.steps.find((s) => !s.ok);
  const blame = firstBad ? buildBlame(topic, analysis, firstBad.conceptId, result) : null;
  return { ...result, variantId: variant.id, blame };
}

export function buildBlame(topic, analysis, conceptId, result) {
  const concept = topic.concepts.find((c) => c.id === conceptId);
  const state = analysis.states[conceptId];
  const ev = analysis.evidence[conceptId];
  const others = result.steps.filter((s) => !s.ok && s.conceptId !== conceptId).map((s) => s.conceptId);
  return {
    conceptId,
    conceptLabel: concept.label,
    state, // "wrong" | "missing"
    sentence: state === "wrong" ? ev.sentence : null,
    message: state === "wrong" ? ev.misconception.explain : concept.gap,
    alsoFailing: [...new Set(others)],
  };
}

export function formatMoney(n) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Every concept the learner has stated correctly. */
export function knownConcepts(topic, analysis) {
  return topic.concepts.filter((c) => analysis.states[c.id] === "known");
}
