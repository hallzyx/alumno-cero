import { db, parse } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { levelFor } from "@/lib/levels";

export const dynamic = "force-dynamic";

// GET -> { dbOk, learner|null, state|null }  (state = the most recent unfinished journey)
export async function GET() {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ dbOk: true, learner: null, state: null });
    const [rows] = await (await db()).query(
      "SELECT id, state FROM learning_sessions WHERE learner_id = ? AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1",
      [learner.id],
    );
    const state = rows[0]?.state ? { ...parse(rows[0].state), sid: rows[0].id } : null;
    return Response.json({
      dbOk: true,
      learner: { username: learner.username, nickname: learner.nickname, avatar: learner.avatar, grade: learner.grade, level: levelFor(learner.xp) },
      state,
    });
  } catch (e) {
    return dbDown(e);
  }
}
