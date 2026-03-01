const CACHE = "ideas-ipad-cache-v2";

// Minimal “app shell”
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
];

// Plotly CDN (biće cache-ovan pri prvom učitavanju)
const CDN_ASSETS = [
  "https://cdn.plot.ly/plotly-2.30.0.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_ASSETS);
    // CDN cache attempt (opaque response ok)
    for (const url of CDN_ASSETS) {
      try { await cache.add(url); } catch (_) {}
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // Cache-first for everything (PWA offline)
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // Save successful GET responses
      if (req.method === "GET" && fresh && fresh.status === 200) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      // Offline fallback: return cached index if navigation
      if (req.mode === "navigate") {
        const fallback = await cache.match("./index.html");
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
