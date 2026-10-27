import { db } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { levelFor } from "@/lib/levels";
import { capabilities } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET -> the family / school panel: every profile of the account with its progress, and the classrooms.
export async function GET() {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const acc = learner.account;
    const pool = await db();
    const [profiles] = await pool.query(
      `SELECT l.id, l.nickname, l.avatar, l.grade, l.classroom_id, l.xp, l.last_seen, (l.id = ?) AS is_owner,
              (SELECT COUNT(*) FROM mastery_cards m WHERE m.learner_id = l.id) AS mastered,
              (SELECT COUNT(*) FROM attempts a WHERE a.learner_id = l.id) AS attempts,
              (SELECT COALESCE(SUM(a.passed), 0) FROM attempts a WHERE a.learner_id = l.id) AS passed
       FROM learners l WHERE l.id = ? OR l.owner_id = ? ORDER BY (l.id = ?) DESC, l.created_at`,
      [acc.id, acc.id, acc.id, acc.id],
    );
    const [classrooms] = await pool.query(
      `SELECT c.id, c.name, c.grade, c.code,
              (SELECT COUNT(*) FROM learners s WHERE s.classroom_id = c.id) AS students
       FROM classrooms c WHERE c.owner_id = ? ORDER BY c.created_at`,
      [acc.id],
    );
    return Response.json({
      account: { username: acc.username, nickname: acc.nickname, plan: acc.plan },
      caps: capabilities(acc.plan),
      activeId: learner.id,
      isOwner: learner.id === acc.id,
      profiles: profiles.map((p) => ({
        id: p.id, nickname: p.nickname, avatar: p.avatar, grade: p.grade, classroomId: p.classroom_id, isOwner: Boolean(p.is_owner),
        level: levelFor(p.xp), mastered: Number(p.mastered), attempts: Number(p.attempts), passed: Number(p.passed), lastSeen: p.last_seen,
      })),
      classrooms: classrooms.map((c) => ({ id: c.id, name: c.name, grade: c.grade, code: c.code, students: Number(c.students) })),
    });
  } catch (e) {
    return dbDown(e);
  }
}
