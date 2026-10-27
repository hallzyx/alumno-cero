import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { dbDown, hashPassword, normUsername, startSession, validUsername } from "@/lib/learner";
import { isPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";
const AVATARS = ["zero", "rocket", "book", "star", "bolt", "leaf"];
const GRADES = ["primaria-alta", "secundaria-1", "secundaria-2", "secundaria-3", "otro"];

// POST { username, password, nickname, avatar, grade, plan } -> creates the account on a plan and signs in.
// The payment step is a simulation done in the UI: there is no gateway, nothing is charged.
export async function POST(req) {
  try {
    const b = await req.json();
    const username = normUsername(b.username);
    const password = String(b.password ?? "");
    const nickname = String(b.nickname ?? "").replace(/\s+/g, " ").trim().slice(0, 24) || username;
    if (!isPlan(b.plan)) return Response.json({ error: "Elige un plan para crear tu cuenta.", field: "plan" }, { status: 400 });
    if (!validUsername(username)) return Response.json({ error: "Tu usuario debe tener 3 a 20 letras minúsculas, números o _ (sin espacios).", field: "username" }, { status: 400 });
    if (password.length < 4 || password.length > 72) return Response.json({ error: "Tu contraseña debe tener al menos 4 caracteres.", field: "password" }, { status: 400 });
    const pool = await db();
    const [taken] = await pool.query("SELECT 1 FROM learners WHERE username = ?", [username]);
    if (taken[0]) return Response.json({ error: "Ese usuario ya existe. Prueba con otro.", field: "username" }, { status: 409 });
    const id = randomUUID();
    await pool.query("INSERT INTO learners (id, username, nickname, avatar, grade, pass_hash, plan) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      id, username, nickname, AVATARS.includes(b.avatar) ? b.avatar : "zero", GRADES.includes(b.grade) ? b.grade : null, await hashPassword(password), b.plan,
    ]);
    await startSession(id);
    return Response.json({ ok: true, plan: b.plan });
  } catch (e) {
    return dbDown(e);
  }
}
