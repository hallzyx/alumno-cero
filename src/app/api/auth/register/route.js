import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { dbDown, hashPassword, normUsername, startSession, validUsername } from "@/lib/learner";

export const dynamic = "force-dynamic";
const AVATARS = ["zero", "rocket", "book", "star", "bolt", "leaf"];
const GRADES = ["primaria-alta", "secundaria-1", "secundaria-2", "secundaria-3", "otro"];

// POST { username, password, nickname, avatar, grade } -> creates the account and signs in
export async function POST(req) {
  try {
    const b = await req.json();
    const username = normUsername(b.username);
    const password = String(b.password ?? "");
    const nickname = String(b.nickname ?? "").replace(/\s+/g, " ").trim().slice(0, 24) || username;
    if (!validUsername(username)) return Response.json({ error: "Tu usuario debe tener 3 a 20 letras minúsculas, números o _ (sin espacios)." }, { status: 400 });
    if (password.length < 4 || password.length > 72) return Response.json({ error: "Tu contraseña debe tener al menos 4 caracteres." }, { status: 400 });
    const pool = await db();
    const [taken] = await pool.query("SELECT 1 FROM learners WHERE username = ?", [username]);
    if (taken[0]) return Response.json({ error: "Ese usuario ya existe. Prueba con otro." }, { status: 409 });
    const id = randomUUID();
    await pool.query("INSERT INTO learners (id, username, nickname, avatar, grade, pass_hash) VALUES (?, ?, ?, ?, ?, ?)", [
      id, username, nickname, AVATARS.includes(b.avatar) ? b.avatar : "zero", GRADES.includes(b.grade) ? b.grade : null, await hashPassword(password),
    ]);
    await startSession(id);
    return Response.json({ ok: true });
  } catch (e) {
    return dbDown(e);
  }
}
