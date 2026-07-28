// Версия SW: при её повышении ротируются кэши static/pages (см. CACHE_* ниже)
const SW_VERSION = '6';

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
    icon: payload.data?.icon || '/includes/img/anlite/anlogo.webp',
    badge: '/includes/img/anlite/anlogo.webp',
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

const CACHEABLE_API_PATHS = [];

// App shell — только критические манифесты и иконки (без HTML страниц!)
const PRECACHE_STATIC = [
  '/manifest.webmanifest',
  '/icons.svg',
  '/img/branding/pulse.svg',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((c) => c.addAll(PRECACHE_STATIC).catch(() => { }))
      .then(() => self.skipWaiting())
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
      .then(() => self.clients.claim())
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function saveToCache(cacheName, request, response) {
  if (response && (response.status === 200 || response.status === 0)) {
    caches.open(cacheName)
      .then((c) => c.put(request, response.clone()))
      .catch(() => { });
  }
}

/** Network First: сеть → кэш → fallback */
function networkFirst(event, cacheName, offlineFallback) {
  event.respondWith(
    fetch(event.request)
      .then((res) => { saveToCache(cacheName, event.request, res); return res; })
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
          .then((res) => {
            if (res && (res.status === 200 || res.status === 0)) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => null);

        if (cached) return cached;
        return networkFetch.then((res) => res || new Response('', { status: 504, statusText: 'Gateway Timeout' }));
      })
    )
  );
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

  // Аудио .mp3 — обрабатывается IndexedDB-плеером, HTTP Range не поддерживает кэш
  if (req.destination === 'audio' || url.pathname.endsWith('.mp3')) return;

  // ── 1. Изображения (обложки, аватарки, стикеры AVIF) → Stale-While-Revalidate
  const isImage =
    req.destination === 'image' ||
    url.pathname.includes('/includes/img/') ||
    /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(url.pathname);

  if (isImage) { staleWhileRevalidate(event, CACHE_IMAGES); return; }

  // ── 2. Статические ресурсы Next.js (JS/CSS/шрифты) → Network First with 404 Eviction
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/includes/') ||
    /\.(js|css|woff2?|ico)(\?|$)/.test(url.pathname) ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.status === 404) {
            caches.open(CACHE_STATIC).then((c) => c.delete(req));
          } else {
            saveToCache(CACHE_STATIC, req, res);
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || new Response('', { status: 404 })))
    );
    return;
  }

  // ── 3. HTML-навигация — Network First с фолбэком на shell `/` ─────────────
  const isNavigate = req.mode === 'navigate' || (req.headers.get('Accept') || '').includes('text/html');

  if (isNavigate) {
    networkFirst(event, CACHE_PAGES, () => caches.match('/'));
  }
});
