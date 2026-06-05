// Service Worker for Atlan Metro Green Book
// SAFE implementation: version-based cache management to prevent stale bundle issues

const VERSION = "v1.0.0";
const CACHE_NAME = `green-book-${VERSION}`;
const OFFLINE_PAGE = "/";

// Assets to precache (app shell + offline fallback)
const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/favicon.ico",
  "/apple-touch-icon.png",
];

// Install: precache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
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
