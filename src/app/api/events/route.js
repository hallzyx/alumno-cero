import { db, isId, json } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { getTopic } from "@/lib/topics";
import { reward } from "@/lib/gamification";

export const dynamic = "force-dynamic";
const clip = (s, n) => String(s ?? "").slice(0, n);

// POST { type: "attempt" | "mastered" | "practice", sid, payload } -> permanent history rows (idempotent)
export async function POST(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const { type, sid, payload = {} } = await req.json();
    const pool = await db();
    const [own] = isId(sid) ? await pool.query("SELECT topic_id FROM learning_sessions WHERE id = ? AND learner_id = ?", [sid, learner.id]) : [[]];
    if (!own[0] || !getTopic(own[0].topic_id)) return Response.json({ error: "Sesión desconocida." }, { status: 404 });
    const topicId = own[0].topic_id;

    if (type === "attempt") {
      await pool.query(
        `INSERT IGNORE INTO attempts (session_id, learner_id, topic_id, attempt_no, variant_id, explanation, analysis, exam, passed, ai_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sid, learner.id, topicId, Number(payload.attemptNo) || 1, clip(payload.variantId, 10), clip(payload.explanation, 4000), json(payload.analysis), json(payload.exam), payload.passed ? 1 : 0, payload.exam?.ai || payload.analysis?.log?.ai ? 1 : 0],
      );
    } else if (type === "mastered") {
      await pool.query(
        `INSERT INTO mastery_cards (session_id, learner_id, topic_id, explanation, concepts, attempts) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE explanation = VALUES(explanation), concepts = VALUES(concepts), attempts = VALUES(attempts)`,
        [sid, learner.id, topicId, clip(payload.explanation, 4000), json(Array.isArray(payload.concepts) ? payload.concepts.map((c) => clip(c, 200)) : []), Number(payload.attempts) || 1],
      );
    } else if (type !== "practice") {
      return Response.json({ error: "Evento desconocido." }, { status: 400 });
    }
    const result = await reward(learner.id, {
      type, sid,
      attemptNo: Number(payload.attemptNo) || 1,
      passed: Boolean(payload.passed),
      key: clip(payload.key, 40),
    });
    return Response.json({ ok: true, reward: result });
  } catch (e) {
    return dbDown(e);
  }
}
