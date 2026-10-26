import { db } from "@/lib/db";
import { clearFails, dbDown, normUsername, recordFail, startSession, throttled, verifyPassword } from "@/lib/learner";

export const dynamic = "force-dynamic";

// POST { username, password } -> signs in
export async function POST(req) {
  try {
    const b = await req.json();
    const username = normUsername(b.username);
    if (throttled(username)) return Response.json({ error: "Demasiados intentos. Espera unos minutos y vuelve a probar." }, { status: 429 });
    const [rows] = await (await db()).query("SELECT id, pass_hash FROM learners WHERE username = ?", [username]);
    const ok = rows[0] ? await verifyPassword(String(b.password ?? ""), rows[0].pass_hash) : false;
    if (!ok) {
      recordFail(username);
      return Response.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }
    clearFails(username);
    await startSession(rows[0].id);
    return Response.json({ ok: true });
  } catch (e) {
    return dbDown(e);
  }
}
