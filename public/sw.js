// public/sw.js

const CACHE_NAME = "kidare-app-v4";
const API_CACHE = "kidare-api-v4";
const IMAGE_CACHE = "kidare-images-v4";

// فایل‌های اصلی برنامه برای App Shell
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

/**
 * تشخیص درخواست API
 */
function isApiRequest(url) {
  return url.pathname.startsWith("/api");
}

/**
 * تشخیص درخواست تصویر
 */
function isImageRequest(request, url) {
  return (
    request.destination === "image" ||
    url.hostname.includes("picsum.photos") ||
    url.hostname.includes("unsplash.com") ||
    url.hostname.includes("placehold.co")
  );
}

/**
 * درخواست‌هایی که نباید هندل شوند
 */
function shouldIgnoreRequest(request, url) {
  return (
    (request.method !== "GET" && !isApiRequest(url)) ||
    url.protocol === "chrome-extension:" ||
    url.protocol === "moz-extension:" ||
    url.pathname.includes("/@vite/") ||
    url.pathname.includes("/node_modules/") ||
    url.pathname.includes("hot-update") ||
    url.pathname.includes("/socket.io/")
  );
}

/**
 * ذخیره امن در کش
 */
async function putInCache(cacheName, request, response) {
  if (!response) return;

  if (response.status === 200 || response.status === 0) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
}

/**
 * نصب Service Worker
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
});

/**
 * فعال‌سازی و حذف کش‌های قدیمی
 */
self.addEventListener("activate", (event) => {
  self.clients.claim();

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, API_CACHE, IMAGE_CACHE].includes(key)) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
});

/**
 * مدیریت درخواست‌ها
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldIgnoreRequest(request, url)) {
    return;
  }

  // 1) API GET -> Network First, Fallback to Cache
  if (isApiRequest(url)) {
    if (request.method === "GET") {
      event.respondWith(
        fetch(request)
          .then(async (response) => {
            await putInCache(API_CACHE, request, response);
            return response;
          })
          .catch(async () => {
            console.log("[Service Worker] API offline fallback:", request.url);
            const cached = await caches.match(request);
            return (
              cached ||
              new Response(
                JSON.stringify({
                  success: false,
                  message: "این داده در حال حاضر در دسترس نیست.",
                }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              )
            );
          })
      );
    } else {
      event.respondWith(fetch(request));
    }
    return;
  }

  // 2) Images -> Cache First, Fallback to Network
  if (isImageRequest(request, url)) {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          await putInCache(IMAGE_CACHE, request, networkResponse);
          return networkResponse;
        } catch (error) {
          console.log("[Service Worker] Image fetch failed:", request.url, error);
          return new Response("", { status: 504, statusText: "Image fetch failed" });
        }
      })
    );
    return;
  }

  // 3) Navigation requests (React SPA)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        console.log("[Service Worker] Offline navigation fallback");
        return (await caches.match("/index.html")) || Response.error();
      })
    );
    return;
  }

  // 4) Static assets -> Stale While Revalidate
  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      const networkFetch = fetch(request)
        .then(async (response) => {
          await putInCache(CACHE_NAME, request, response);
          return response;
        })
        .catch((error) => {
          console.log("[Service Worker] Static fetch failed:", request.url, error);
          return cachedResponse || Response.error();
        });

      return cachedResponse || networkFetch;
    })
  );
});