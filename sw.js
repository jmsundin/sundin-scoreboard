// The build stamps each deploy's commit here, so every deploy is a new worker
// that the page offers as an update ("Restart now").
const VERSION = "__APP_COMMIT__";
const CACHE = `scoreboard-${VERSION}`;
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  // No skipWaiting: the new version waits until the user taps "Restart now".
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// The cached shell keeps the loaded version running (and working offline)
// until the user restarts into the new one.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const key = request.mode === "navigate" ? "/" : request;
  event.respondWith(caches.open(CACHE)
    .then((cache) => cache.match(key, { ignoreSearch: true }))
    .then((cached) => cached || fetch(request)));
});
