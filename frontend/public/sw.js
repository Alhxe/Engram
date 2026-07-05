// Minimal service worker: makes Engram installable. Network-first passthrough,
// so it never serves stale content — it just satisfies the PWA install criteria.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Let the browser handle every request normally.
});
