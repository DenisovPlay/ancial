import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// HTML-навигация в Service Worker — Network-First: онлайн всегда свежий HTML, кэш только без сети.
const src = fs.readFileSync(new URL('../../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
const code = src.slice(src.indexOf('/** Сколько ждём сеть'), src.indexOf('/** Stale-While-Revalidate: мгновенно'));

function setup({ fetchImpl, cachedBody }) {
  const store = new Map();
  if (cachedBody) store.set('req', cachedBody);
  const caches = {
    open: async () => ({
      match: async () => (store.has('req') ? { body: store.get('req') } : undefined),
      put: (key, value) => store.set(`put:${key}`, value),
    }),
  };
  let result;
  const event = { request: 'req', respondWith: (promise) => { result = promise; }, waitUntil() {} };
  const handler = new Function('caches', 'fetch', 'isCacheableResponse', 'Response', `${code}; return networkFirstNavigation;`)(
    caches,
    fetchImpl,
    () => true,
    class { constructor(body, init) { this.body = body; this.status = init?.status; } },
  );
  return (fallback) => {
    handler(event, 'pages', fallback);
    return result;
  };
}

test('онлайн отдаётся свежий HTML, даже если в кэше есть прошлая версия', async () => {
  const run = setup({ fetchImpl: async () => ({ body: 'fresh', clone() { return this; } }), cachedBody: 'stale' });
  assert.equal((await run(() => ({ body: 'offline' }))).body, 'fresh');
});

test('без сети отдаётся кэш страницы', async () => {
  const run = setup({ fetchImpl: async () => { throw new Error('offline'); }, cachedBody: 'stale' });
  assert.equal((await run(() => ({ body: 'offline' }))).body, 'stale');
});

test('нет ни сети, ни кэша — офлайн-заглушка', async () => {
  const run = setup({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal((await run(() => ({ body: 'offline' }))).body, 'offline');
});
