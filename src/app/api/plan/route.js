import { db } from "@/lib/db";
import { currentLearner, dbDown } from "@/lib/learner";
import { capabilities, isPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

// POST { plan } -> sets the plan of the signed-in account.
// Demo only: the "payment" is simulated in the UI, nothing is charged and no card data is ever collected.
export async function POST(req) {
  try {
    const learner = await currentLearner();
    if (!learner) return Response.json({ error: "Inicia sesión primero." }, { status: 401 });
    const { plan } = await req.json();
    if (!isPlan(plan)) return Response.json({ error: "Plan desconocido." }, { status: 400 });
    await (await db()).query("UPDATE learners SET plan = ? WHERE id = ?", [plan, learner.account.id]);
    return Response.json({ ok: true, plan, caps: capabilities(plan) });
  } catch (e) {
    return dbDown(e);
  }
}
