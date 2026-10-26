// Server-only: award XP (idempotent) and evaluate badges.
import { db } from "./db.js";
import { BADGES, XP, levelFor } from "./levels.js";
import { getTopic } from "./topics.js";

/** Insert one XP award; returns the amount actually granted (0 if already awarded). */
async function award(pool, learnerId, reason, ref, amount) {
  const [r] = await pool.query("INSERT IGNORE INTO xp_log (learner_id, reason, ref, amount) VALUES (?, ?, ?, ?)", [learnerId, reason, String(ref).slice(0, 80), amount]);
  if (!r.affectedRows) return 0;
  await pool.query("UPDATE learners SET xp = xp + ? WHERE id = ?", [amount, learnerId]);
  return amount;
}

export async function streakOf(pool, learnerId) {
  const [days] = await pool.query("SELECT DISTINCT DATE(created_at) d FROM attempts WHERE learner_id = ? ORDER BY d DESC LIMIT 60", [learnerId]);
  const key = (d) => new Date(d).toISOString().slice(0, 10);
  const set = new Set(days.map((r) => key(r.d)));
  const cursor = new Date();
  if (!set.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (set.has(key(cursor))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return streak;
}

async function evaluateBadges(pool, learnerId) {
  const [[t]] = await pool.query("SELECT COUNT(*) attempts, COALESCE(SUM(passed),0) passed FROM attempts WHERE learner_id = ?", [learnerId]);
  const [[fp]] = await pool.query("SELECT COUNT(*) n FROM attempts a WHERE a.learner_id = ? AND a.passed = 1 AND a.attempt_no = 1", [learnerId]);
  const [cards] = await pool.query("SELECT topic_id FROM mastery_cards WHERE learner_id = ?", [learnerId]);
  const [[me]] = await pool.query("SELECT xp FROM learners WHERE id = ?", [learnerId]);
  const streak = await streakOf(pool, learnerId);
  const subjects = new Set(cards.map((c) => getTopic(c.topic_id)?.subject).filter(Boolean));

  const earned = {
    "primer-examen": t.attempts >= 1,
    "aprobe": Number(t.passed) >= 1,
    "al-primer-intento": fp.n >= 1,
    "primera-ficha": cards.length >= 1,
    "coleccionista": cards.length >= 3,
    "constante": t.attempts >= 10,
    "racha-3": streak >= 3,
    "racha-7": streak >= 7,
    "explorador": subjects.size >= 2,
    "estrella": levelFor(me.xp).n >= 5,
  };
  const fresh = [];
  for (const [code, ok] of Object.entries(earned)) {
    if (!ok) continue;
    const [r] = await pool.query("INSERT IGNORE INTO badges (learner_id, code) VALUES (?, ?)", [learnerId, code]);
    if (r.affectedRows) fresh.push({ code, ...BADGES[code] });
  }
  return fresh;
}

/**
 * Apply the XP rules for one event and report what changed, so the UI can celebrate.
 * events: attempt {sid, attemptNo, passed} | mastered {sid} | practice {sid, key}
 */
export async function reward(learnerId, event) {
  const pool = await db();
  const [[before]] = await pool.query("SELECT xp FROM learners WHERE id = ?", [learnerId]);
  let gained = 0;
  const lines = [];
  const add = async (reason, ref, amount, label) => {
    const g = await award(pool, learnerId, reason, ref, amount);
    if (g) { gained += g; lines.push({ label, xp: g }); }
  };

  if (event.type === "attempt") {
    await add("attempt", `${event.sid}:${event.attemptNo}`, XP.attempt, "Examen hecho");
    if (event.passed) {
      await add("pass", `${event.sid}:${event.attemptNo}`, XP.pass, "¡Cero aprobó!");
      if (event.attemptNo === 1) await add("first-try", event.sid, XP.firstTry, "Al primer intento");
    }
    await add("daily", new Date().toISOString().slice(0, 10), XP.daily, "Primer estudio del día");
  } else if (event.type === "mastered") {
    await add("mastered", event.sid, XP.mastered, "Ficha de dominio");
  } else if (event.type === "practice") {
    await add("practice", `${event.sid}:${event.key}`, XP.practice, "Respuesta correcta");
  }

  const newBadges = await evaluateBadges(pool, learnerId);
  const [[after]] = await pool.query("SELECT xp FROM learners WHERE id = ?", [learnerId]);
  const lvlBefore = levelFor(before.xp);
  const lvlAfter = levelFor(after.xp);
  return { gained, lines, level: lvlAfter, levelUp: lvlAfter.n > lvlBefore.n, newBadges };
}
