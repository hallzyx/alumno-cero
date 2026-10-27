// Offline support (browser only): the progress keeps living in localStorage; for signed-in accounts every write
// that could not reach the server is queued in an "outbox" and replayed when the connection returns.
// Replays are safe: the server endpoints are idempotent (state upsert, unique attempts/cards, unique XP awards).

const OUTBOX = "alumno-cero:outbox:";
const ACCOUNT = "alumno-cero:account";

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

/* ----------------------------- cached account ------------------------------ */
// Lets a signed-in learner keep using the app with no connection (plan, profile, level as last seen online).

export const cacheAccount = (data) => write(ACCOUNT, { ...data, cachedAt: Date.now() });
export const cachedAccount = () => read(ACCOUNT, null);
export const forgetAccount = () => { try { localStorage.removeItem(ACCOUNT); } catch { /* ignore */ } };

/* --------------------------------- outbox ---------------------------------- */

export const outboxSize = (pid) => (pid ? read(OUTBOX + pid, []).length : 0);

/** Keep only the newest snapshot per journey, in the position of the first one (events need the row to exist). */
export function queueState(pid, sid, state) {
  if (!pid || !sid) return;
  const ops = read(OUTBOX + pid, []);
  const i = ops.findIndex((o) => o.k === "state" && o.sid === sid);
  if (i >= 0) ops[i] = { k: "state", sid, state };
  else ops.push({ k: "state", sid, state });
  write(OUTBOX + pid, ops);
}

export function queueEvent(pid, sid, type, payload) {
  if (!pid || !sid) return;
  const ops = read(OUTBOX + pid, []);
  ops.push({ k: "event", sid, type, payload });
  write(OUTBOX + pid, ops);
}

const post = (url, method, body) => fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/**
 * Replay the outbox in order. Stops at the first network failure (keeps the rest).
 * Returns { sent, left, rewards[], expired }.
 */
export async function flushOutbox(pid) {
  const ops = read(OUTBOX + pid, []);
  const rewards = [];
  let sent = 0;
  let expired = false;
  const left = [];
  let stopped = false;
  for (const op of ops) {
    if (stopped) { left.push(op); continue; }
    try {
      const r = op.k === "state"
        ? await post("/api/state", "PUT", { sid: op.sid, state: op.state })
        : await post("/api/events", "POST", { type: op.type, sid: op.sid, payload: op.payload });
      if (r.status === 401) { expired = true; stopped = true; left.push(op); continue; }
      if (r.status >= 500) { stopped = true; left.push(op); continue; }
      if (r.ok && op.k === "event") { const j = await r.json().catch(() => ({})); if (j.reward) rewards.push(j.reward); }
      sent += 1; // 2xx done; 4xx means the server will never accept it, so it is dropped
    } catch {
      stopped = true; left.push(op);
    }
  }
  write(OUTBOX + pid, left);
  return { sent, left: left.length, rewards, expired };
}

/* ------------------------------ service worker ----------------------------- */

export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return; // dev assets change constantly: no caching
  const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
  // This runs after hydration, so the window "load" event may already have fired.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
