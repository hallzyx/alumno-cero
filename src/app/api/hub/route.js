import { db, parse } from "@/lib/db";
import { streakOf } from "@/lib/gamification";
import { currentLearner, dbDown } from "@/lib/learner";
import { levelFor } from "@/lib/levels";

export const dynamic = "force-dynamic";

// GET -> everything the "Mi hub" screen shows (level, badges, per-topic progress, history)
export async function GET() {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const pool = await db();
    const [[sessions], [cards], [recent], [[totals]], [badges], streak] = await Promise.all([
      pool.query("SELECT id, topic_id, status, attempts, updated_at, mastered_at FROM learning_sessions WHERE learner_id = ? ORDER BY updated_at DESC LIMIT 100", [learner.id]),
      pool.query("SELECT id, topic_id, explanation, concepts, attempts, created_at FROM mastery_cards WHERE learner_id = ? ORDER BY created_at DESC LIMIT 100", [learner.id]),
      pool.query("SELECT topic_id, attempt_no, passed, ai_used, created_at FROM attempts WHERE learner_id = ? ORDER BY created_at DESC LIMIT 10", [learner.id]),
      pool.query("SELECT COUNT(*) attempts, COALESCE(SUM(passed),0) passed FROM attempts WHERE learner_id = ?", [learner.id]),
      pool.query("SELECT code, earned_at FROM badges WHERE learner_id = ?", [learner.id]),
      streakOf(pool, learner.id),
    ]);
    return Response.json({
      learner: { username: learner.username, nickname: learner.nickname, avatar: learner.avatar, grade: learner.grade, since: learner.created_at },
      level: levelFor(learner.xp),
      stats: { attempts: Number(totals.attempts), passed: Number(totals.passed), mastered: cards.length, streak },
      badges: badges.map((b) => ({ code: b.code, at: b.earned_at })),
      sessions: sessions.map((s) => ({ sid: s.id, topicId: s.topic_id, status: s.status, attempts: s.attempts, updatedAt: s.updated_at, masteredAt: s.mastered_at })),
      cards: cards.map((c) => ({ id: c.id, topicId: c.topic_id, explanation: c.explanation, concepts: parse(c.concepts), attempts: c.attempts, at: c.created_at })),
      recent: recent.map((a) => ({ topicId: a.topic_id, attemptNo: a.attempt_no, passed: !!a.passed, ai: !!a.ai_used, at: a.created_at })),
    });
  } catch (e) {
    return dbDown(e);
  }
}
