// Serves the app from cache so it opens instantly and works with no signal.
// A new deploy changes VERSION, which installs a new worker that waits until
// the page asks it to take over (the "Restart now" button).
const VERSION = "__APP_VERSION__";
const CACHE = `scoreboard-${VERSION}`;
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("scoreboard-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = req.mode === "navigate"
      ? await cache.match("index.html")
      : await cache.match(req, { ignoreSearch: true });
    return hit || fetch(req);
  })());
});
