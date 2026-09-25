import test from 'node:test';
import assert from 'node:assert/strict';

import { setItemWithEviction } from './storage-eviction.ts';

/** Хранилище с лимитом по суммарной длине значений и счётчиком чтений. */
function createStorage(limit: number) {
  const map = new Map<string, string>();
  const stats = { reads: 0 };
  const size = () => [...map.values()].reduce((sum, v) => sum + v.length, 0);
  const storage = {
    get length() { return map.size; },
    key(i: number) { return [...map.keys()][i] ?? null; },
    getItem(k: string) { stats.reads += 1; return map.get(k) ?? null; },
    removeItem(k: string) { map.delete(k); },
    setItem(k: string, v: string) {
      const prev = map.get(k)?.length ?? 0;
      if (size() - prev + v.length > limit) {
        const err = new Error('quota') as Error & { name: string };
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(k, v);
    },
  };
  return { map, stats, storage };
}

const envelope = (createdAt: number, extra: Record<string, unknown> = {}, pad = 50) =>
  JSON.stringify({ __cacheEnvelope: true, createdAt, data: 'x'.repeat(pad), ...extra });

test('evicts oldest first and stops as soon as the value fits', () => {
  const { map, storage } = createStorage(400);
  map.set('c', envelope(300));
  map.set('a', envelope(100));
  map.set('b', envelope(200));
  assert.equal(setItemWithEviction(storage, 'new', 'y'.repeat(250), new Set()), true);
  assert.equal(map.has('a'), false);
  assert.equal(map.has('b'), false);
  assert.equal(map.has('c'), true);
  assert.equal(map.has('new'), true);
});

test('expired entries go first; persistent keys and envelopes are kept', () => {
  const { map, storage } = createStorage(300);
  map.set('old', envelope(1));
  map.set('expired', envelope(500, { expiresAt: 10 }));
  map.set('persist', envelope(0, { isPersistent: true }));
  map.set('token', 'legacy-token-value');
  assert.equal(setItemWithEviction(storage, 'new', 'y'.repeat(60), new Set(['token']), 1000), true);
  assert.equal(map.has('expired'), false);
  assert.equal(map.has('old'), true);
  assert.equal(map.has('persist'), true);
  assert.equal(map.get('token'), 'legacy-token-value');
});

test('legacy non-envelope values are treated as oldest', () => {
  const { map, storage } = createStorage(200);
  map.set('fresh', envelope(900));
  map.set('legacy', 'not json at all ' + 'z'.repeat(60));
  assert.equal(setItemWithEviction(storage, 'new', 'y'.repeat(80), new Set()), true);
  assert.equal(map.has('legacy'), false);
  assert.equal(map.has('fresh'), true);
});

test('storage is scanned once, not once per evicted entry', () => {
  const { map, stats, storage } = createStorage(1000);
  for (let i = 0; i < 40; i += 1) map.set(`k${i}`, envelope(i, {}, 10));
  stats.reads = 0;
  assert.equal(setItemWithEviction(storage, 'big', 'y'.repeat(990), new Set()), true);
  assert.ok(stats.reads <= 40, `reads: ${stats.reads}`);
});

test('gives up when nothing can be evicted', () => {
  const { map, storage } = createStorage(50);
  map.set('persist', envelope(0, { isPersistent: true }, 10));
  assert.equal(setItemWithEviction(storage, 'new', 'y'.repeat(200), new Set()), false);
  assert.equal(map.has('persist'), true);
});
