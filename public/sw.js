// Alumno Cero service worker: the app keeps working without internet once it has been opened online.
//  - HTML pages: network first, falling back to the cached app shell (every route is the same client app).
//  - /_next/static, fonts, icons: cache first (hashed files never change).
//  - /api/* and other origins (model files, OpenRouter): never touched here; the app handles those failures.
const VERSION = "ac-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.webmanifest"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // Only our own old versions: the in-browser AI model (~1 GB) lives in WebLLM's caches of this same origin.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ac-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function shell(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(SHELL)).put("/", res.clone());
    return res;
  } catch {
    return (await caches.match("/")) ?? new Response("Sin conexión. Abre Alumno Cero una vez con internet para usarlo sin conexión.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(ASSETS)).put(request, res.clone());
  return res;
}

async function networkThenCache(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(ASSETS)).put(request, res.clone());
    return res;
  } catch {
    const hit = await caches.match(request);
    if (hit) return hit;
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  if (req.mode === "navigate") return event.respondWith(shell(req));
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) return event.respondWith(cacheFirst(req));
  event.respondWith(networkThenCache(req));
});
