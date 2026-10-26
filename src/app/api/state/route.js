import { db, isId, json, parse } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { getTopic } from "@/lib/topics";

export const dynamic = "force-dynamic";
const MAX_STATE = 250_000;

// GET ?sid= -> { state } (resume one journey from the hub)
export async function GET(req) {
  try {
    const learner = await currentLearner();
    const sid = new URL(req.url).searchParams.get("sid");
    if (!learner || !isId(sid)) return Response.json({ error: "No autorizado." }, { status: 401 });
    const [rows] = await (await db()).query("SELECT state FROM learning_sessions WHERE id = ? AND learner_id = ?", [sid, learner.id]);
    if (!rows[0]) return Response.json({ error: "No existe." }, { status: 404 });
    return Response.json({ state: { ...parse(rows[0].state), sid } });
  } catch (e) {
    return dbDown(e);
  }
}

// PUT { sid, state } -> upsert the live snapshot of a journey
export async function PUT(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const { sid, state } = await req.json();
    if (!isId(sid) || !state || !getTopic(state.topicId)) return Response.json({ error: "Estado inválido." }, { status: 400 });
    const snapshot = json({ ...state, sid: undefined });
    if (snapshot.length > MAX_STATE) return Response.json({ error: "Estado demasiado grande." }, { status: 413 });
    await (await db()).query(
      `INSERT INTO learning_sessions (id, learner_id, topic_id, goal, level, input_mode, frictions, status, attempts, state, mastered_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE goal = VALUES(goal), level = VALUES(level), input_mode = VALUES(input_mode), frictions = VALUES(frictions),
         status = VALUES(status), attempts = VALUES(attempts), state = VALUES(state), mastered_at = COALESCE(mastered_at, VALUES(mastered_at))
       `,
      [
        sid, learner.id, state.topicId, state.goal ?? null, state.level ?? null, state.inputMode ?? null, json(state.frictions ?? {}),
        state.mastered ? "mastered" : "in_progress", Number(state.attempt) || 0, snapshot, state.mastered ? new Date(state.mastered.at) : null,
      ],
    );
    return Response.json({ ok: true });
  } catch (e) {
    return dbDown(e);
  }
}
