import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { planOf } from "@/lib/plans";

export const dynamic = "force-dynamic";
const AVATARS = ["zero", "rocket", "book", "star", "bolt", "leaf"];
const GRADES = ["primaria-alta", "secundaria-1", "secundaria-2", "secundaria-3", "otro"];

// POST { nickname, avatar, grade, classroomId? } -> adds a child / student profile to the account.
// Only the account owner (adult mode) can add profiles, within the limits of the plan.
export async function POST(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const plan = planOf(learner.account.plan);
    if (learner.id !== learner.account.id) return Response.json({ error: "Vuelve al perfil del adulto para añadir estudiantes." }, { status: 403 });
    if (!plan || plan.maxChildren < 1) return Response.json({ error: "Tu plan es para un solo estudiante. Con Familia+ puedes añadir más hijos." }, { status: 403 });
    const b = await req.json();
    const nickname = String(b.nickname ?? "").replace(/\s+/g, " ").trim().slice(0, 24);
    if (nickname.length < 2) return Response.json({ error: "Escribe un nombre de al menos 2 letras.", field: "nickname" }, { status: 400 });
    const pool = await db();
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM learners WHERE owner_id = ?", [learner.account.id]);
    if (Number(n) >= plan.maxChildren) return Response.json({ error: `Tu plan permite hasta ${plan.maxChildren} perfiles adicionales.` }, { status: 403 });
    let classroomId = null;
    if (b.classroomId) {
      const [c] = await pool.query("SELECT id FROM classrooms WHERE id = ? AND owner_id = ?", [b.classroomId, learner.account.id]);
      if (!c[0]) return Response.json({ error: "Esa aula no existe.", field: "classroomId" }, { status: 400 });
      classroomId = c[0].id;
    }
    const id = randomUUID();
    // Profiles can't sign in on their own (pass_hash "!" never verifies): the adult switches to them.
    await pool.query("INSERT INTO learners (id, username, nickname, avatar, grade, pass_hash, owner_id, classroom_id) VALUES (?, ?, ?, ?, ?, '!', ?, ?)", [
      id, `p_${randomBytes(5).toString("hex")}`, nickname, AVATARS.includes(b.avatar) ? b.avatar : "zero", GRADES.includes(b.grade) ? b.grade : null, learner.account.id, classroomId,
    ]);
    return Response.json({ ok: true, id });
  } catch (e) {
    return dbDown(e);
  }
}
