const SW_VERSION = '2.2';

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
  const title = payload.data?.title || 'Ancial';
  const options = {
    body: payload.data?.body || 'Новое уведомление',
    icon: payload.data?.icon || '/includes/img/anlite/anlogo.webp',
    badge: '/includes/img/anlite/anlogo.webp',
    tag: 'ancial-notification',
    data: {
      url: payload.data?.click_action || 'https://ancial.ru/'
    }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || 'https://ancial.ru/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf('ancial.ru') !== -1 && 'focus' in client) {
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

const CACHE_STATIC  = 'ancial-static-v2';
const CACHE_PAGES   = 'ancial-pages-v2';
const CACHE_IMAGES  = 'ancial-images-v1';
// Кэш для API-ответов, которые нужны офлайн (языки, справочники)
const CACHE_API     = 'ancial-api-v1';

// Список API-эндпоинтов V2 которые кэшируются SW (Stale-While-Revalidate)
// Остальные /api/V2/* запросы SW не трогает — данные живут в localStorage
const CACHEABLE_API_PATHS = [];

// App shell — критические файлы, кэшируются при установке
const PRECACHE_STATIC = [
  '/',
  '/manifest.webmanifest',
  '/icons.svg',
  '/img/branding/pulse.svg',
];

// Страницы для предварительного кэширования при установке SW
const PRECACHE_PAGES = [
  '/pulse',
  '/messages',
  '/apps',
  '/feed',
  '/friends',
  '/notifications',
  '/settings',
  '/settings/cache',
  '/wallet',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then((c) => c.addAll(PRECACHE_STATIC).catch(() => {})),
      caches.open(CACHE_PAGES).then((c) =>
        Promise.allSettled(PRECACHE_PAGES.map((url) => c.add(url).catch(() => {})))
      ),
    ]).then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowed = [CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, CACHE_API];
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.map((n) => (!allowed.includes(n) && n.startsWith('ancial-')) ? caches.delete(n) : undefined)
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
      .catch(() => {});
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

/** Cache First: кэш → сеть → кэш */
function cacheFirst(event, cacheName) {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => { saveToCache(cacheName, event.request, res); return res; })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
}

/** Stale-While-Revalidate: мгновенно из кэша + фоновое обновление */
function staleWhileRevalidate(event, cacheName) {
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((res) => {
            if (res.status === 200 || res.status === 0) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => undefined);
        return cached || networkFetch;
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

  // Firebase, Google APIs — пропускаем без кэша
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('gstatic.com')
  ) return;

  // ── 0. Избранные API-эндпоинты → Stale-While-Revalidate ─────────────────
  // Эти ответы нужны офлайн (локализация и т.п.) и не меняются часто.
  // Загружаются мгновенно из кэша, в фоне обновляются при наличии сети.
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

  // ── 2. Статические ресурсы Next.js (JS/CSS/шрифты) → Cache First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/includes/') ||
    /\.(js|css|woff2?|ico)(\?|$)/.test(url.pathname) ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) { cacheFirst(event, CACHE_STATIC); return; }

  // ── 3. Next.js RSC/data payloads → Network First
  // Клиентские переходы App Router: _rsc=... параметр или RSC заголовок
  // /_next/data/ — Pages Router data
  const isRsc =
    url.searchParams.has('_rsc') ||
    req.headers.get('RSC') === '1' ||
    url.pathname.startsWith('/_next/data/');

  if (isRsc) { networkFirst(event, CACHE_PAGES, null); return; }

  // ── 4. HTML-навигация (любой маршрут) → Network First + shell fallback
  // Охватывает: /, /messages, /apps, /pulse, /feed, /friends и любой другой маршрут
  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    networkFirst(event, CACHE_PAGES, () =>
      caches.match('/').then((shell) => shell || new Response('', { status: 503 }))
    );
    return;
  }

  // ── 5. Next.js API Route Handlers (/apps/api/*, /api/*) → без кэша
  // Данные API-хэндлеров хранятся приложением в localStorage через cache.ts
});
