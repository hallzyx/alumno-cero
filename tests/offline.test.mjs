// Tests for plans, the offline outbox and the service worker logic (no browser needed).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { GUEST, PLANS, PLAN_LIST, capabilities, isPlan } from "../src/lib/plans.js";

/* ---------------------------------- plans ---------------------------------- */

test("plans: guests get no cloud AI/voice; each plan unlocks its own interface", () => {
  assert.deepEqual([capabilities(null).cloudAI, capabilities(null).voice, capabilities(null).family, capabilities(null).classrooms], [false, false, false, false]);
  assert.equal(capabilities("familia").cloudAI, true);
  assert.equal(capabilities("familia").family, false);
  assert.equal(capabilities("familia-plus").family, true);
  assert.equal(capabilities("familia-plus").maxChildren, 3);
  assert.equal(capabilities("colegio").classrooms, true);
  assert.equal(PLANS.familia.maxChildren, 0);
  assert.ok(!isPlan("invitado") && !isPlan("admin") && isPlan("colegio"));
  assert.equal(PLAN_LIST.length, 3);
  assert.ok(GUEST.features.some((f) => /sin voz/i.test(f)));
});

/* --------------------------------- outbox ---------------------------------- */

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("outbox: keeps one snapshot per journey and replays in order; stops on network failure", async () => {
  globalThis.localStorage = fakeStorage();
  const { queueEvent, queueState, flushOutbox, outboxSize } = await import("../src/lib/offline.js");
  const pid = "p1";
  queueState(pid, "s1", { v: 1 });
  queueEvent(pid, "s1", "attempt", { attemptNo: 1 });
  queueState(pid, "s1", { v: 2 }); // replaces the first snapshot, keeps its position
  queueEvent(pid, "s1", "mastered", {});
  assert.equal(outboxSize(pid), 3);

  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(`${init.method} ${url}`);
    return { status: 200, ok: true, json: async () => ({ reward: { gained: 10 } }) };
  };
  const res = await flushOutbox(pid);
  assert.deepEqual(calls, ["PUT /api/state", "POST /api/events", "POST /api/events"]); // state first, then events
  assert.equal(res.sent, 3);
  assert.equal(res.left, 0);
  assert.equal(res.rewards.length, 2);
  assert.equal(outboxSize(pid), 0);

  // network down: nothing is lost
  queueState(pid, "s2", { a: 1 });
  queueEvent(pid, "s2", "attempt", {});
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  const down = await flushOutbox(pid);
  assert.equal(down.sent, 0);
  assert.equal(down.left, 2);
  assert.equal(outboxSize(pid), 2);

  // expired session keeps the data too; a 4xx rejection drops only that item
  globalThis.fetch = async () => ({ status: 401, ok: false, json: async () => ({}) });
  assert.equal((await flushOutbox(pid)).expired, true);
  assert.equal(outboxSize(pid), 2);
  globalThis.fetch = async () => ({ status: 400, ok: false, json: async () => ({}) });
  assert.equal((await flushOutbox(pid)).left, 0);
});

/* ------------------------------ service worker ----------------------------- */

function loadSW() {
  const handlers = {};
  const store = new Map(); // cacheName -> Map(url -> Response)
  const caches = {
    open: async (name) => {
      if (!store.has(name)) store.set(name, new Map());
      const c = store.get(name);
      return { addAll: async (urls) => { for (const u of urls) c.set(new URL(u, "http://x").href, new Response(`cached:${u}`)); }, put: async (req, res) => { c.set(typeof req === "string" ? new URL(req, "http://x").href : req.url, res); } };
    },
    match: async (req) => {
      const url = typeof req === "string" ? new URL(req, "http://x").href : req.url;
      for (const c of store.values()) if (c.has(url)) return c.get(url).clone();
      return undefined;
    },
    keys: async () => [...store.keys()],
    delete: async (n) => store.delete(n),
  };
  const self = { location: { origin: "http://x" }, addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const state = { online: true };
  const fetch = async (req) => { if (!state.online) throw new TypeError("offline"); return new Response(`net:${new URL(req.url).pathname}`); };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self, caches, fetch, Response, URL, Promise });
  const run = (event) => { let p; handlers[event.type]({ ...event, waitUntil: (x) => { p = x; }, respondWith: (x) => { p = x; } }); return p; };
  const req = (path, mode = "cors") => ({ url: `http://x${path}`, method: "GET", mode });
  return { state, run, req };
}

test("service worker: the app shell and assets are served without a connection", async () => {
  const sw = loadSW();
  await sw.run({ type: "install" });

  // online: pages and assets come from the network and get cached
  assert.equal(await (await sw.run({ type: "fetch", request: sw.req("/temas", "navigate") })).text(), "net:/temas");
  assert.equal(await (await sw.run({ type: "fetch", request: sw.req("/_next/static/chunks/a.js") })).text(), "net:/_next/static/chunks/a.js");

  // offline: any route falls back to the cached shell, assets come from the cache
  sw.state.online = false;
  const page = await sw.run({ type: "fetch", request: sw.req("/aprender/regla-de-tres/ensenar", "navigate") });
  assert.equal(await page.text(), "net:/temas"); // the shell cached by the last successful visit
  assert.equal(await (await sw.run({ type: "fetch", request: sw.req("/_next/static/chunks/a.js") })).text(), "net:/_next/static/chunks/a.js");
});

test("service worker: never touches the API or other methods", () => {
  const sw = loadSW();
  // The handler returns early (no respondWith), so the harness gets no promise back.
  assert.equal(sw.run({ type: "fetch", request: { ...sw.req("/api/state"), method: "PUT" } }), undefined);
  assert.equal(sw.run({ type: "fetch", request: sw.req("/api/hub") }), undefined);
});
