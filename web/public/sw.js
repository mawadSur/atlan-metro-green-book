// Service Worker for Atlan Metro Green Book
// SAFE implementation: version-based cache management to prevent stale bundle issues

const VERSION = "v1.0.0";
const CACHE_NAME = `green-book-${VERSION}`;
const OFFLINE_PAGE = "/";

// Assets to precache (app shell). The offline fallback IS "/" (OFFLINE_PAGE),
// so we do not list a separate /offline.html that doesn't exist.
const PRECACHE_ASSETS = [
  "/",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

// Install: precache app shell.
// Cache each asset individually so one missing/failed asset can NEVER fail the
// whole SW install (cache.addAll is atomic — a single 404 would brick the PWA
// for every visitor). skipWaiting still runs regardless.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_ASSETS.map((asset) =>
            cache.add(asset).catch((err) => {
              // tolerate an individual asset failing; log and continue
              console.warn("[sw] precache skipped:", asset, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches (CRITICAL: prevents stale bundle)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith("green-book-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (e.g., Leaflet OSM tiles, Supabase)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache-first for icons and static assets
  if (url.pathname.startsWith("/icons/") || url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation (with cache fallback)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Default: network only for API calls, data, etc.
  event.respondWith(fetch(request));
});
