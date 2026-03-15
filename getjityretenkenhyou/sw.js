const CACHE_NAME = "monthly-tire-check-v34";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=20260312-2",
  "./app.js?v=20260315-7",
  "./manifest.webmanifest",
  "./sw.js",
  "./firebase/firebase-config.js?v=20260315-7",
  "./firebase/firebase-cloud-sync.js?v=20260315-7",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/monthly-complete.png"
];
const NETWORK_FIRST_PATH_SUFFIXES = [
  "/app.js",
  "/styles.css",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Cross-origin requests like Firebase/Firestore should bypass the app cache.
  if (!isSameOrigin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Firebase runtime files must be fresh (avoid stale SW cache)
  if (
    url.pathname.endsWith("/firebase/firebase-config.js")
    || url.pathname.endsWith("/firebase/firebase-cloud-sync.js")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (NETWORK_FIRST_PATH_SUFFIXES.some((suffix) => url.pathname.endsWith(suffix))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        });
    })
  );
});
