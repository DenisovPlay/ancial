// Версия SW: при её повышении ротируются кэши static/pages (см. CACHE_* ниже)
// v21: messages context menu scroll lock
const SW_VERSION = '21';

importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyASzxKce3_K8UU0tq-Z6FP_9XIP4v491Rw",
  authDomain: "ancial-notification.firebaseapp.com",
  projectId: "ancial-notification",
  messagingSenderId: "952168193669",
  appId: "1:952168193669:web:6b238d3552d90280cfd3ec"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'Zypo';
  const options = {
    body: payload.data?.body || 'Новое уведомление',
    icon: payload.data?.icon || '/img/zypo/logo-rounded.webp',
    badge: '/img/zypo/logo-rounded.webp',
    tag: 'ancial-notification',
    data: {
      url: payload.data?.click_action || self.location.origin + '/'
    }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || self.location.origin + '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ─── OFFLINE CACHING ────────────────────────────────────────────────────────

const CACHE_STATIC = `ancial-static-v${SW_VERSION}`;
const CACHE_PAGES = `ancial-pages-v${SW_VERSION}`;
const CACHE_IMAGES = 'ancial-images-v1';
const CACHE_API = 'ancial-api-v1';

/** Soft cap for image cache entries (FIFO trim). Keeps phones from filling storage. */
const IMAGE_CACHE_MAX_ENTRIES = 280;

const CACHEABLE_API_PATHS = [];

// App shell — манифесты, иконки + HTML-маршруты, нужные для cold offline open
const PRECACHE_STATIC = [
  '/manifest.webmanifest',
  '/icons.svg',
  '/img/branding/pulse.svg',
  '/img/zypo/logo-rounded.webp',
];

// HTML-страницы НЕ precache-ятся при install:
// закешированный HTML ссылается на /_next/static/chunkXXX.js — после деплоя
// эти чанки удаляются → ChunkLoadError. Страницы попадают в CACHE_PAGES
// только через networkFirst при живых посещениях (Network-First = всегда свежий HTML).
const PRECACHE_PAGES = [];

function offlineShellHtml() {
  return new Response(
    `<!doctype html><html lang="ru"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<meta name="theme-color" content="#000000"/>
<title>Zypo</title>
<style>
  html,body{margin:0;height:100%;background:#000;color:#fff;font-family:system-ui,-apple-system,sans-serif}
  .wrap{min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:9999px;background:rgba(39,39,42,.9);border:1px solid rgba(82,82,91,.3);font-size:12px}
  .spin{width:18px;height:18px;border:2px solid #a855f7;border-top-color:transparent;border-radius:50%;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  a{color:#c4b5fd;text-decoration:none}
</style>
</head><body>
  <div class="wrap">
    <div class="pill"><span class="spin"></span><span>Переподключение...</span></div>
    <div style="opacity:.7;font-size:14px">Нет сети. Можно открыть сохранённые разделы Pulse.</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px">
      <a href="/">Главная</a>
      <a href="/pulse">Pulse</a>
      <a href="/pulse/library">Библиотека</a>
      <a href="/pulse/my">Моё</a>
    </div>
  </div>
  <script>
    window.addEventListener('online', function () {
      location.reload();
    });
  </script>
</body></html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}

function precacheList(cacheName, urls) {
  return caches.open(cacheName).then((cache) =>
    Promise.all(
      urls.map((url) =>
        cache.add(url).catch(() => {
          // ignore individual failures (route may 404 on first deploy)
        }),
      ),
    ),
  );
}

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // skipWaiting сразу: новый SW активируется без кнопки «Обновить»
  event.waitUntil(
    precacheList(CACHE_STATIC, PRECACHE_STATIC).then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowed = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_API];
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.map((n) => (!allowed.includes(n)) ? caches.delete(n) : undefined)
        )
      )
      // clients.claim: новый SW сразу контролирует все вкладки
      .then(() => self.clients.claim())
  );
});

// Клиент: SKIP_WAITING | WARM_URLS
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'WARM_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const pageCache = await caches.open(CACHE_PAGES);
        const staticCache = await caches.open(CACHE_STATIC);
        const imageCache = await caches.open(CACHE_IMAGES);

        await Promise.all(
          data.urls.map(async (rawUrl) => {
            try {
              const url = new URL(String(rawUrl), self.location.origin);
              if (url.origin !== self.location.origin) return;

              const req = new Request(url.pathname + url.search, { credentials: 'same-origin' });
              const res = await fetch(req);
              if (!isCacheableResponse(res)) return;

              const path = url.pathname;
              const isImage =
                /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(path) ||
                path.includes('/includes/img/');
              const isStatic =
                path.startsWith('/_next/static/') ||
                path.startsWith('/img/') ||
                path.startsWith('/fonts/') ||
                path.startsWith('/includes/') ||
                /\.(js|css|woff2?|ico)(\?|$)/i.test(path);

              if (isImage) {
                await imageCache.put(req, res.clone());
                await trimImageCache(imageCache);
              } else if (isStatic) {
                await staticCache.put(req, res.clone());
              } else {
                await pageCache.put(req, res.clone());
              }
            } catch {
              // ignore warm failures
            }
          }),
        );
      })(),
    );
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCacheableResponse(response) {
  return Boolean(response && (response.status === 200 || response.status === 0));
}

function saveToCache(cacheName, request, response) {
  if (isCacheableResponse(response)) {
    caches.open(cacheName)
      .then(async (c) => {
        await c.put(request, response.clone());
        if (cacheName === CACHE_IMAGES) {
          await trimImageCache(c);
        }
      })
      .catch(() => { });
  }
}

function deleteFromCache(cacheName, request) {
  return caches.open(cacheName)
    .then((c) => c.delete(request))
    .catch(() => false);
}

/** FIFO trim: drop oldest keys when over IMAGE_CACHE_MAX_ENTRIES */
async function trimImageCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= IMAGE_CACHE_MAX_ENTRIES) return;
    const overflow = keys.length - IMAGE_CACHE_MAX_ENTRIES;
    await Promise.all(keys.slice(0, overflow).map((req) => cache.delete(req)));
  } catch {
    // ignore
  }
}

/** Network First: сеть → кэш → fallback. Для HTML (защита от shell со старыми чанками). */
function networkFirst(event, cacheName, offlineFallback) {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Кэшируем только успешный HTML/ответ — не сохраняем 404/5xx
        if (isCacheableResponse(res)) {
          saveToCache(cacheName, event.request, res);
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return offlineFallback
            ? offlineFallback()
            : new Response('', { status: 503, statusText: 'Offline' });
        })
      )
  );
}

/** Stale-While-Revalidate: мгновенно из кэша + фоновое обновление */
function staleWhileRevalidate(event, cacheName) {
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then(async (res) => {
            if (isCacheableResponse(res)) {
              await cache.put(event.request, res.clone());
              if (cacheName === CACHE_IMAGES) {
                await trimImageCache(cache);
              }
            } else if (res && res.status === 404) {
              // Пропавший ассет — вычищаем, чтобы не отдавать «зомби»
              await cache.delete(event.request);
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }
        return networkFetch.then((res) => res || new Response('', { status: 504, statusText: 'Gateway Timeout' }));
      })
    )
  );
}

/** Cache-First для изображений: если в кэше есть — отдаём мгновенно (0ms),
 *  без постоянного фонового перезапроса сети, чтобы картинки не моргали. */
function cacheFirstImages(event, cacheName) {
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(async (res) => {
            if (isCacheableResponse(res)) {
              await cache.put(event.request, res.clone());
              await trimImageCache(cache);
            }
            return res;
          })
          .catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout' }));
      })
    )
  );
}

/**
 * Cache-First для hashed /_next/static (immutable по URL).
 * Если в кэше есть — отдаём сразу (офлайн + скорость).
 * Если нет — сеть, кладём в кэш.
 * Если сеть 404 — чистим кэш и отдаём 404 (клиент сделает hard-reload за новым HTML).
 */
function cacheFirstHashedStatic(event, cacheName) {
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) {
          // Фоново обновим; 404 → удалим. Обязательно в event.waitUntil,
          // чтобы SW не завершился до записи в кэш.
          event.waitUntil(
            fetch(event.request)
              .then((res) => {
                if (res && res.status === 404) {
                  return cache.delete(event.request);
                } else if (isCacheableResponse(res)) {
                  return cache.put(event.request, res.clone());
                }
              })
              .catch(() => { })
          );
          return cached;
        }

        return fetch(event.request)
          .then((res) => {
            if (res && res.status === 404) {
              cache.delete(event.request);
              return res;
            }
            if (isCacheableResponse(res)) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout' }));
      })
    )
  );
}

/**
 * Network-First для прочих static (img/, fonts, /includes/) с 404-eviction.
 * Онлайн — свежие файлы; офлайн — кэш.
 */
function networkFirstStatic(event, cacheName) {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.status === 404) {
          deleteFromCache(cacheName, event.request);
        } else if (isCacheableResponse(res)) {
          saveToCache(cacheName, event.request, res);
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached || new Response('', { status: 404 })
        )
      )
  );
}

async function navigationOfflineFallback() {
  // Prefer real shell, then any warm pulse page, then minimal offline HTML
  const preferred = ['/', '/pulse', '/pulse/my', '/pulse/library'];
  for (const path of preferred) {
    const hit = await caches.match(path);
    if (hit) return hit;
  }
  return offlineShellHtml();
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Только GET
  if (req.method !== 'GET') return;

  // Разработка (localhost/127.0.0.1) — не кэшируем, чтобы HMR работал
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Firebase, Google APIs, External Cinema CDNs — пропускаем без кэша
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('yandex.net') ||
    url.hostname.includes('factorios.live') ||
    url.hostname.includes('cdnhubstream.pro')
  ) return;

  // ── 0. Избранные API-эндпоинты → Stale-While-Revalidate ─────────────────
  if (CACHEABLE_API_PATHS.some((p) => url.pathname === p || url.pathname.endsWith(p))) {
    staleWhileRevalidate(event, CACHE_API);
    return;
  }

  // Бэкенд PHP/V2 API (динамические данные — кэшируются в localStorage)
  if (url.pathname.includes('/V2/') || url.pathname.includes('/api/V2/')) return;

  // Next RSC / data payloads — всегда сеть (иначе SPA-навигация залипает на старом билде)
  if (
    url.searchParams.has('_rsc') ||
    req.headers.get('RSC') === '1' ||
    url.pathname.includes('/_next/data/')
  ) {
    return;
  }

  // Аудио .mp3 — IndexedDB-плеер, HTTP Range не дружит с Cache API
  if (req.destination === 'audio' || url.pathname.endsWith('.mp3')) return;

  // ── 1. Изображения → Stale-While-Revalidate (сначала кэш, потом обновление)
  const isImage =
    req.destination === 'image' ||
    url.pathname.includes('/includes/img/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(url.pathname);

  if (isImage) {
    cacheFirstImages(event, CACHE_IMAGES);
    return;
  }

  // ── 2a. Hashed Next chunks/CSS → Cache-First (URL = content hash)
  // Это и скорость, и офлайн. 404 на сервере → eviction + клиентский hard-reload.
  if (url.pathname.startsWith('/_next/static/')) {
    cacheFirstHashedStatic(event, CACHE_STATIC);
    return;
  }

  // ── 2b. Прочие static (img public, fonts, /includes/) → Network First + 404 eviction
  const isStaticAsset =
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/includes/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(js|css|woff2?|ico)(\?|$)/.test(url.pathname) ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) {
    networkFirstStatic(event, CACHE_STATIC);
    return;
  }

  // ── 3. HTML-навигация — Network First (онлайн всегда свежий shell без мёртвых чанков)
  // Офлайн → кэш страницы → fallback shell `/` → minimal offline HTML
  const isNavigate = req.mode === 'navigate' || (req.headers.get('Accept') || '').includes('text/html');

  if (isNavigate) {
    networkFirst(event, CACHE_PAGES, () => navigationOfflineFallback());
  }
});
