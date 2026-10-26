// Offline cache: the app is static, so once loaded it works without connection.
const CACHE = "alumno-cero-v2";
const ASSETS = ["./", "index.html", "styles.css", "src/app.js", "src/engine.js", "src/topics.js", "src/store.js", "manifest.webmanifest", "fonts/atkinson-hyperlegible-latin-400-normal.woff2", "fonts/atkinson-hyperlegible-latin-400-italic.woff2", "fonts/atkinson-hyperlegible-latin-700-normal.woff2", "fonts/bricolage-grotesque-latin-opsz-normal.woff2", "fonts/caveat-latin-600-normal.woff2"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
