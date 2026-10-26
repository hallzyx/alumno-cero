// Late sign-up: turn the anonymous journey kept in this browser (localStorage) into the
// calls the server already understands (PUT /api/state + POST /api/events), so the learner
// keeps their progress, XP and mastery card. Pure: no fetch, easy to test.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Is there anything worth saving? (a topic and at least some real work) */
export function hasProgress(state) {
  return Boolean(state?.topicId && (state.history?.length || state.mastered || state.text?.trim()));
}

/** Short human summary, e.g. for the "save your progress" box. */
export function progressSummary(state, topicTitle) {
  const tries = state?.history?.length ?? 0;
  const bits = [];
  if (state?.mastered) bits.push("tu ficha de dominio");
  if (tries) bits.push(`${tries} ${tries === 1 ? "examen" : "exámenes"} de Cero`);
  if (!bits.length && state?.text?.trim()) bits.push("tu explicación");
  return bits.length ? `${bits.join(" y ")} de «${topicTitle}»` : "";
}

/**
 * Build the migration plan.
 * @param {object} state  anonymous state from localStorage
 * @param {() => string} newId  id generator (crypto.randomUUID in the browser)
 * @returns {{ sid: string, snapshot: object, events: Array<{type: string, payload: object}> } | null}
 */
export function buildMigration(state, newId) {
  if (!hasProgress(state)) return null;
  const sid = UUID.test(state.sid ?? "") ? state.sid : newId();
  const history = Array.isArray(state.history) ? state.history : [];
  const events = history.map((h, i) => {
    const last = i === history.length - 1;
    // Only the last attempt still has its explanation/analysis/exam in the browser.
    const exam = last && state.exam && state.exam.variantId === h.variantId ? state.exam : null;
    return {
      type: "attempt",
      payload: {
        attemptNo: Number(h.attempt) || i + 1,
        variantId: h.variantId ?? exam?.variantId ?? "",
        passed: Boolean(h.passed),
        explanation: last ? state.mastered?.text ?? state.text ?? "" : "",
        analysis: last ? state.analysis ?? null : null,
        exam,
      },
    };
  });
  if (state.mastered) {
    events.push({
      type: "mastered",
      payload: { explanation: state.mastered.text ?? state.text ?? "", concepts: state.mastered.concepts ?? [], attempts: history.length || 1 },
    });
  }
  return { sid, snapshot: { ...state, sid }, events };
}

/** Merge several reward responses into one, for a single celebration toast. */
export function mergeRewards(rewards) {
  const list = rewards.filter(Boolean);
  if (!list.length) return null;
  const byLabel = new Map();
  for (const r of list) for (const l of r.lines ?? []) byLabel.set(l.label, (byLabel.get(l.label) ?? 0) + l.xp);
  return {
    gained: list.reduce((n, r) => n + (r.gained || 0), 0),
    lines: [...byLabel].map(([label, xp]) => ({ label, xp })),
    level: list[list.length - 1].level,
    levelUp: list.some((r) => r.levelUp),
    newBadges: list.flatMap((r) => r.newBadges ?? []),
  };
}
