"use strict";

const CACHE_VERSION = "v9";
const ASSETS_CACHE  = "kidareh-assets-v1";          // پایدار برای فونت/آیکون
const SHELL_CACHE   = `kidareh-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `kidareh-runtime-${CACHE_VERSION}`;
const KNOWN_CACHES  = [ASSETS_CACHE, SHELL_CACHE, RUNTIME_CACHE];

const PRECACHE_SHELL = [
  "/static/offline.html",
  "/static/css/style.css",
  "/static/css/theme-mh.css",
  "/static/css/pages.css",
  "/static/css/components.css",
  "/static/css/site-shell.css",
  "/static/css/home.css",
  "/static/css/auth-pages.css",
  "/static/js/ui.js",
  "/static/js/pwa-rules.js",
  "/static/js/app.js",
  "/static/js/location-picker.js",
  "/static/js/pages.js",
  "/static/js/home.js",
  "/static/js/auth.js",
  "/static/js/pwa.js",
  "/static/manifest.webmanifest",
];

const PRECACHE_ASSETS = [
  "/static/fonts/Vazirmatn-Variable.woff2",
  "/static/icons/icon-192.png",
  "/static/icons/icon-512.png",
  "/static/icons/icon-192-maskable.png",
  "/static/icons/icon-512-maskable.png",
];

const PRIVATE_PATH = /^\/(account|seller|admin|messages|support|monetization|saved|following|profile|settings)(\/|$)/;
const API_PATH = /^\/api\//;
const CATALOG_PATH = /^\/(search|stores)\/?$/;
const PRODUCT_PATH = /^\/product\/[^/]+\/?$/;
const STORE_PATH   = /^\/store\/[^/]+\/?$/;
const RUNTIME_MAX_ENTRIES = 80;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const [shell, assets] = await Promise.all([
      caches.open(SHELL_CACHE),
      caches.open(ASSETS_CACHE),
    ]);
    const putAll = (cache, list) => Promise.allSettled(list.map(async url => {
      try {
        const r = await fetch(url, { cache: "reload" });
        if (r.ok) await cache.put(url, r);
      } catch {}
    }));
    await Promise.all([putAll(shell, PRECACHE_SHELL), putAll(assets, PRECACHE_ASSETS)]);
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith("kidareh-") && !KNOWN_CACHES.includes(k))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      try { await cache.put(request, response.clone()); } catch {}
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match("/static/offline.html");
      if (offline) return offline;
    }
    return new Response("ارتباط برقرار نشد.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function staleWhileRevalidate(event, request, cacheName) {
  const cachePromise = caches.open(cacheName);
  const network = cachePromise
    .then(cache => fetch(request).then(response => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone()).then(() => trimCache(cacheName, RUNTIME_MAX_ENTRIES)).catch(() => {});
      }
      return response;
    }))
    .catch(() => null);

  return cachePromise.then(cache => cache.match(request)).then(cached => {
    if (cached) {
      event.waitUntil(network.catch(() => {}));
      return cached;
    }
    return network.then(res => {
      if (res) return res;
      if (request.mode === "navigate") {
        return caches.match("/static/offline.html").then(o =>
          o || new Response("", { status: 503, headers: { "Content-Type": "text/plain" } }));
      }
      return new Response("", { status: 503, headers: { "Content-Type": "text/plain" } });
    });
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (PRIVATE_PATH.test(url.pathname) || API_PATH.test(url.pathname)) return;

  if (request.mode === "navigate" && CATALOG_PATH.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, request, RUNTIME_CACHE));
    return;
  }
  if (request.mode === "navigate" &&
      (PRODUCT_PATH.test(url.pathname) || STORE_PATH.test(url.pathname) || url.pathname === "/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }
  if (url.pathname.startsWith("/static/icons/") || url.pathname.startsWith("/static/fonts/")) {
    event.respondWith(caches.open(ASSETS_CACHE).then(c => c.match(request)).then(r => r ||
      fetch(request).then(resp => {
        if (resp.ok) caches.open(ASSETS_CACHE).then(c => c.put(request, resp.clone())).catch(() => {});
        return resp;
      }).catch(() => new Response("", { status: 503 }))));
    return;
  }
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(staleWhileRevalidate(event, request, SHELL_CACHE));
    return;
  }
  // catch-all: هر ناوبری باقی‌مانده (login, register, help, ...)
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }
});