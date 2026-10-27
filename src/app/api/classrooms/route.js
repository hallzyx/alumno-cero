import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { planOf } from "@/lib/plans";

export const dynamic = "force-dynamic";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GRADES = ["primaria-alta", "secundaria-1", "secundaria-2", "secundaria-3", "otro"];
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// POST { name, grade } -> creates a classroom (Colegios plan, adult mode).
export async function POST(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const plan = planOf(learner.account.plan);
    if (learner.id !== learner.account.id) return Response.json({ error: "Vuelve al perfil docente para crear aulas." }, { status: 403 });
    if (!plan || plan.maxClassrooms < 1) return Response.json({ error: "Las aulas son parte del plan Colegios." }, { status: 403 });
    const b = await req.json();
    const name = String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (name.length < 2) return Response.json({ error: "Ponle un nombre al aula (por ejemplo «2.º B»).", field: "name" }, { status: 400 });
    const pool = await db();
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM classrooms WHERE owner_id = ?", [learner.account.id]);
    if (Number(n) >= plan.maxClassrooms) return Response.json({ error: `Tu plan permite hasta ${plan.maxClassrooms} aulas.` }, { status: 403 });
    const id = randomUUID();
    for (let i = 0; i < 5; i++) {
      try {
        const code = newCode();
        await pool.query("INSERT INTO classrooms (id, owner_id, name, grade, code) VALUES (?, ?, ?, ?, ?)", [id, learner.account.id, name, GRADES.includes(b.grade) ? b.grade : null, code]);
        return Response.json({ ok: true, id, code });
      } catch (e) {
        if (e?.code !== "ER_DUP_ENTRY") throw e; // code collision: try another
      }
    }
    return Response.json({ error: "No pude generar un código de aula. Intenta de nuevo." }, { status: 500 });
  } catch (e) {
    return dbDown(e);
  }
}
