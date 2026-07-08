const SW_VERSION = '1.2';

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
      // Если не нашли — открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- OFFLINE CACHING IMPLEMENTATION ---

const CACHE_NAME_STATIC = 'ancial-static-v1';
const CACHE_NAME_PAGES = 'ancial-pages-v1';
const CACHE_NAME_IMAGES = 'ancial-images-v1';

// Critical assets to cache on install (precaching)
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons.svg',
  '/img/branding/pulse.svg'
];

// Install Event: cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME_STATIC, CACHE_NAME_PAGES, CACHE_NAME_IMAGES];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!allowedCaches.includes(cacheName) && cacheName.startsWith('ancial-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: handle caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Bypass check: Only cache GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Bypass check: Do not cache in development mode (localhost/127.0.0.1) to avoid HMR code caching
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // 2. Bypass check: Exclude firebase/dynamic API calls
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.includes('/V2/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis')
  ) {
    return;
  }

  // 3. Bypass check: Exclude media files (.mp3) - handled by custom player via IndexedDB
  if (request.destination === 'audio' || url.pathname.endsWith('.mp3')) {
    return;
  }

  // 4. Strategy: HTML Documents (Pages) and Next.js RSC/data payloads -> Network First
  const isHtml = request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
  // RSC payloads: клиентская навигация Next.js App Router (_rsc param или заголовок RSC)
  const isRsc = url.searchParams.has('_rsc') || request.headers.get('RSC') === '1';
  // Next.js Pages Router data files (dynamic routes like /messages)
  const isNextData = url.pathname.startsWith('/_next/data/');

  if (isHtml || isRsc || isNextData) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME_PAGES).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Для навигационных запросов — отдаём корень (shell)
            if (isHtml) {
              return caches.match('/');
            }
            return new Response('', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // 5. Strategy: Images (covers, avatars, stickers including AVIF) -> Cache First (in CACHE_NAME_IMAGES)
  const isImage =
    request.destination === 'image' ||
    url.pathname.includes('/includes/img/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.avif') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg');

  if (isImage) {
    event.respondWith(
      caches.open(CACHE_NAME_IMAGES).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            // Игнорируем сетевые ошибки, так как мы можем быть в офлайне
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 6. Strategy: Static Assets (JS, CSS, Fonts, Icons) -> Cache First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/includes/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200 || response.status === 0) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME_STATIC).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((err) => {
          console.error('Failed to fetch asset:', request.url, err);
        });
      })
    );
    return;
  }
});
