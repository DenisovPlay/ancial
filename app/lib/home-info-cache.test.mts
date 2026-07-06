import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOME_INFO_CACHE_TTL_MS,
  readCachedCurrency,
  readCachedWeather,
  writeCachedCurrency,
  writeCachedWeather,
} from './home-info-cache.ts';

function setupMockLocalStorage() {
  const store: Record<string, string> = {};
  const mockStorage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      for (const key in store) {
        delete store[key];
      }
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
  };

  const testGlobal = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
  const originalWindow = testGlobal.window;

  testGlobal.window = {
    localStorage: mockStorage,
  } as Window & typeof globalThis;

  return {
    restore: () => {
      testGlobal.window = originalWindow;
    },
    store,
  };
}

test('currency cache uses the home namespace and 12 hour TTL', (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  writeCachedCurrency({ eur: '88.03', usd: '77.22' });

  const raw = store['ancial:home:currency:rates'];
  assert.ok(raw);

  const envelope = JSON.parse(raw);
  assert.equal(envelope.category, 'home');
  assert.equal(envelope.subcategory, 'currency');
  assert.equal(envelope.expiresAt - envelope.createdAt, HOME_INFO_CACHE_TTL_MS);
  assert.deepEqual(readCachedCurrency(), { eur: '88.03', usd: '77.22' });
});

test('weather cache is city-specific and uses the home namespace', (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  writeCachedWeather('Moscow', { temp: 23, wfont: '<svg></svg>' });

  const raw = store['ancial:home:weather:city:Moscow'];
  assert.ok(raw);

  const envelope = JSON.parse(raw);
  assert.equal(envelope.category, 'home');
  assert.equal(envelope.subcategory, 'weather');
  assert.equal(envelope.expiresAt - envelope.createdAt, HOME_INFO_CACHE_TTL_MS);
  assert.deepEqual(readCachedWeather('Moscow'), { temp: 23, wfont: '<svg></svg>' });
  assert.equal(readCachedWeather('London'), null);
});
