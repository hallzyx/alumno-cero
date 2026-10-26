// Server-only accounts: username + password (scrypt), session token in an httpOnly cookie.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db.js";

const scrypt = promisify(scryptCb);
export const COOKIE = "ac_session";
const DAYS = 30;

export const normUsername = (s) => String(s ?? "").trim().toLowerCase();
export const validUsername = (s) => /^[a-z0-9_]{3,20}$/.test(s);

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(pw, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(key, expected);
}

const sha = (t) => createHash("sha256").update(t).digest("hex");

export async function startSession(learnerId) {
  const token = randomBytes(32).toString("hex");
  const pool = await db();
  await pool.query("DELETE FROM auth_sessions WHERE expires_at < NOW()");
  await pool.query("INSERT INTO auth_sessions (token_hash, learner_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))", [sha(token), learnerId, DAYS]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * DAYS });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) (await db()).query("DELETE FROM auth_sessions WHERE token_hash = ?", [sha(token)]).catch(() => {});
  jar.delete(COOKIE);
}

export async function currentLearner() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length !== 64) return null;
  const pool = await db();
  const [rows] = await pool.query(
    `SELECT l.id, l.username, l.nickname, l.avatar, l.grade, l.xp, l.created_at FROM auth_sessions s
     JOIN learners l ON l.id = s.learner_id WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [sha(token)],
  );
  if (!rows[0]) return null;
  pool.query("UPDATE learners SET last_seen = NOW() WHERE id = ?", [rows[0].id]).catch(() => {});
  return rows[0];
}

export const dbDown = (e) => (console.error("[api]", e), Response.json({ error: "No pude conectar con la base de datos.", dbOk: false, detail: e?.code ?? null }, { status: 503 }));

// Tiny in-memory throttle for login attempts (per username): 6 failures / 10 min.
const fails = new Map();
export const throttled = (u) => (fails.get(u) ?? []).filter((t) => Date.now() - t < 600_000).length >= 6;
export const recordFail = (u) => fails.set(u, [...(fails.get(u) ?? []).filter((t) => Date.now() - t < 600_000), Date.now()]);
export const clearFails = (u) => fails.delete(u);
