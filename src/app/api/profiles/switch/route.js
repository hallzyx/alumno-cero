import { db, isId } from "@/lib/db";
import { currentLearner, dbDown, setActiveProfile } from "@/lib/learner";

export const dynamic = "force-dynamic";

// POST { profileId } -> the account switches to another of its profiles (or back to the owner).
export async function POST(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const { profileId } = await req.json();
    if (!isId(profileId)) return Response.json({ error: "Perfil inválido." }, { status: 400 });
    const [rows] = await (await db()).query("SELECT id FROM learners WHERE id = ? AND (id = ? OR owner_id = ?)", [profileId, learner.account.id, learner.account.id]);
    if (!rows[0]) return Response.json({ error: "Ese perfil no es de tu cuenta." }, { status: 404 });
    await setActiveProfile(profileId);
    return Response.json({ ok: true });
  } catch (e) {
    return dbDown(e);
  }
}
