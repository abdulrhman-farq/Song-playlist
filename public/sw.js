/* Ruwaida & Abdulrahman — wedding playlist service worker.
   Goal: keep the app shell + uploaded mp3 blobs alive when the venue's
   WiFi drops mid-reception. Bump CACHE_VERSION on every deploy so
   stale clients pick up the new shell. */

const CACHE_VERSION = "wedding-playlist-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;

/* App shell — minimum required to render an offline first paint.
   Next.js hashed JS/CSS lives under /_next/static/* and gets caught
   by the runtime stale-while-revalidate handler below. */
const SHELL_ASSETS = [
  "/",
  "/logo.png",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // addAll is atomic — if any asset 404s the install fails, so
        // ignore individual failures and add what we can.
        Promise.all(
          SHELL_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => {})
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Returns true for hostnames we never want to intercept — YouTube IFrame
   API, video playback, analytics, etc. They have their own caching rules
   and breaking them would silently kill video playback. */
function isOpaqueThirdParty(url) {
  const host = url.hostname;
  return (
    host.endsWith("youtube.com") ||
    host.endsWith("youtube-nocookie.com") ||
    host.endsWith("ytimg.com") ||
    host.endsWith("googlevideo.com") ||
    host.endsWith("doubleclick.net") ||
    host.endsWith("google-analytics.com")
  );
}

function isFontAsset(url) {
  return (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  );
}

function isNextStaticAsset(url) {
  // Hashed Next.js build output — immutable, safe to cache aggressively.
  return url.pathname.startsWith("/_next/static/");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type !== "opaque") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET — POST/PUT/DELETE pass through untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept opaque third parties (YouTube/etc).
  if (isOpaqueThirdParty(url)) return;

  // Skip non-http(s) schemes — chrome-extension://, data:, blob:, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Versioned font assets — cache-first.
  if (isFontAsset(url)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Same-origin hashed Next.js bundles — stale-while-revalidate keeps
  // navigation snappy and survives the WiFi dropping.
  if (url.origin === self.location.origin && isNextStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Same-origin app shell + page navigations — stale-while-revalidate
  // so a refresh still works offline.
  if (url.origin === self.location.origin) {
    // Navigation requests fall back to the cached "/" shell when offline.
    if (request.mode === "navigate") {
      event.respondWith(
        networkFirst(request, SHELL_CACHE).catch(() =>
          caches.match("/").then(
            (cached) =>
              cached ||
              new Response(
                "<h1>Offline</h1><p>Open this page once while online.</p>",
                { headers: { "Content-Type": "text/html; charset=utf-8" } }
              )
          )
        )
      );
      return;
    }
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Everything else — network-first with cache fallback.
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

/* Allow the page to push a manual SKIP_WAITING (future-proofing for
   an "update ready" UI). */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
