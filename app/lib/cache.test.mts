import assert from 'node:assert/strict';
import test from 'node:test';
import { cache, PERSISTENT_KEYS, resolveKeyInfo } from './cache.ts';

// Helper to set up fake window and localStorage
function setupMockLocalStorage(maxChars = 999999) {
  const store: Record<string, string> = {};

  const getStoreSize = () => {
    let size = 0;
    for (const [k, v] of Object.entries(store)) {
      size += k.length + v.length;
    }
    return size;
  };

  const mockStorage: Storage = {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      for (const k in store) {
        delete store[k];
      }
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      if (key in store) {
        delete store[key];
      }
    },
    setItem: (key: string, value: string) => {
      const addedSize = key.length + String(value).length;
      const existingSize = store[key] ? (key.length + store[key].length) : 0;
      
      if (getStoreSize() - existingSize + addedSize > maxChars) {
        const err = new Error('Mock Storage Quota Exceeded');
        err.name = 'QuotaExceededError';
        (err as any).code = 22;
        throw err;
      }
      
      store[key] = String(value);
    },
  };

  const testGlobal = globalThis as any;
  const originalWindow = testGlobal.window;

  testGlobal.window = {
    localStorage: mockStorage,
  };

  return {
    store,
    restore: () => {
      testGlobal.window = originalWindow;
    },
  };
}

test('resolveKeyInfo maps keys and options correctly', () => {
  // Namespaced options
  assert.deepEqual(resolveKeyInfo('my-key', { category: 'pulse', subcategory: 'playlists' }), {
    storageKey: 'ancial:pulse:playlists:my-key',
    category: 'pulse',
    subcategory: 'playlists',
  });

  // Pre-namespaced key
  assert.deepEqual(resolveKeyInfo('ancial:feed:posts:user-feed'), {
    storageKey: 'ancial:feed:posts:user-feed',
    category: 'feed',
    subcategory: 'posts',
  });

  // Legacy key mapping
  assert.deepEqual(resolveKeyInfo('friends_cache'), {
    storageKey: 'friends_cache',
    category: 'friends',
    subcategory: 'list',
  });

  // Dynamic patterns
  assert.deepEqual(resolveKeyInfo('msg-cache:1:2'), {
    storageKey: 'msg-cache:1:2',
    category: 'chats',
    subcategory: 'messages',
  });

  assert.deepEqual(resolveKeyInfo('preview_track_99'), {
    storageKey: 'preview_track_99',
    category: 'chats',
    subcategory: 'previews',
  });

  assert.deepEqual(resolveKeyInfo('wallet_merchant_detail_cache_5'), {
    storageKey: 'wallet_merchant_detail_cache_5',
    category: 'wallet',
    subcategory: 'merchant_details',
  });
});

test('cache set and get with envelopes and namespaces', (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  const testData = { name: 'Ancial Rock', tracks: 12 };
  cache.set('rock-hits', testData, {
    category: 'pulse',
    subcategory: 'playlists',
    ttl: 60000,
  });

  // Check generated key in store
  const expectedKey = 'ancial:pulse:playlists:rock-hits';
  assert.ok(store[expectedKey]);

  // Check parsing envelope metadata
  const envelope = JSON.parse(store[expectedKey]);
  assert.equal(envelope.__cacheEnvelope, true);
  assert.equal(envelope.category, 'pulse');
  assert.equal(envelope.subcategory, 'playlists');
  assert.deepEqual(envelope.value, testData);

  // Retrieve using cache manager
  const retrieved = cache.get<{ name: string; tracks: number }>('rock-hits', {
    category: 'pulse',
    subcategory: 'playlists',
  });
  assert.deepEqual(retrieved, testData);
});

test('cache get handles legacy JSON and raw string data fallback', (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  // 1. Raw JSON fallback (e.g. legacy friends list cache)
  const legacyFriends = [{ id: 1, name: 'Alice' }];
  store['friends_cache'] = JSON.stringify(legacyFriends);

  const retrieved = cache.get<typeof legacyFriends>('friends_cache');
  assert.deepEqual(retrieved, legacyFriends);

  // 2. Raw string fallback (e.g. legacy token)
  store['token'] = 'super-secret-auth-token-123';
  const retrievedToken = cache.get<string>('token');
  assert.equal(retrievedToken, 'super-secret-auth-token-123');
});

test('cache TTL expiration invalidates entries', async (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  cache.set('temp-key', 'ephemeral', {
    category: 'pulse',
    ttl: 5, // 5ms TTL
  });

  // Immediately available
  assert.equal(cache.get('temp-key', { category: 'pulse' }), 'ephemeral');

  // Wait for expiration
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Now returns null
  assert.equal(cache.get('temp-key', { category: 'pulse' }), null);
  // Key should have been deleted from storage
  assert.equal(store['ancial:pulse:temp-key'], undefined);
});

test('cache clear removes non-persistent and filters by namespace', (t) => {
  const { restore, store } = setupMockLocalStorage();
  t.after(restore);

  // Set various entries
  cache.set('listened-list', [1, 2], { category: 'pulse', subcategory: 'listened' });
  cache.set('fav-artists', ['artist-1'], { category: 'pulse', subcategory: 'artists' });
  cache.set('current-merchants', ['m1'], { category: 'wallet', subcategory: 'merchants' });
  cache.set('token', 'xyz-auth-token', { category: 'pulse', raw: true }); // Mock persistent token

  // Add token key to PERSISTENT_KEYS for safety
  PERSISTENT_KEYS.add('token');

  assert.equal(Object.keys(store).length, 4);

  // 1. Clear only subcategory 'listened'
  cache.clear({ category: 'pulse', subcategory: 'listened' });
  assert.equal(cache.get('listened-list', { category: 'pulse', subcategory: 'listened' }), null);
  assert.ok(cache.get('fav-artists', { category: 'pulse', subcategory: 'artists' }));
  assert.ok(cache.get('current-merchants', { category: 'wallet', subcategory: 'merchants' }));

  // 2. Clear category 'pulse'
  cache.clear({ category: 'pulse' });
  assert.equal(cache.get('fav-artists', { category: 'pulse', subcategory: 'artists' }), null);
  assert.ok(cache.get('current-merchants', { category: 'wallet', subcategory: 'merchants' }));

  // 3. Clear everything (excluding persistent keys)
  cache.clear();
  assert.equal(cache.get('current-merchants', { category: 'wallet', subcategory: 'merchants' }), null);
  assert.equal(store['token'], 'xyz-auth-token'); // Preserved!

  // 4. Force clear everything (including persistent)
  cache.clear({ keepPersistent: false });
  assert.equal(store['token'], undefined); // Cleared!
});

test('cache writes fallback to evicting oldest items when quota is exceeded', (t) => {
  // Max size 350 characters to simulate full storage easily
  const { restore, store } = setupMockLocalStorage(350);
  t.after(restore);

  // Save 3 entries (each consumes ~100 characters due to envelope JSON)
  cache.set('item-1', 'value-one-long-data', { category: 'pulse', subcategory: 'artists' });
  // Wait to ensure distinct createdAt timestamps
  const item1Key = 'ancial:pulse:artists:item-1';
  
  // Save second
  cache.set('item-2', 'value-two-long-data', { category: 'pulse', subcategory: 'artists' });
  const item2Key = 'ancial:pulse:artists:item-2';

  // Save a persistent item (which should never be evicted)
  cache.set('pulse-volume', '0.8', { category: 'pulse', raw: true });

  const initialKeys = Object.keys(store);
  assert.ok(initialKeys.includes(item1Key));
  assert.ok(initialKeys.includes(item2Key));
  assert.ok(initialKeys.includes('pulse-volume'));

  // Attempting to write item-3 triggers quota exceeded since limit is 350
  cache.set('item-3', 'value-three-long-data-which-is-large', { category: 'pulse', subcategory: 'artists' });

  // item-1 (oldest non-persistent) should be evicted
  assert.equal(store[item1Key], undefined);
  // item-2 and pulse-volume should remain
  assert.ok(store[item2Key]);
  assert.equal(store['pulse-volume'], '0.8');
  // item-3 should be written successfully
  assert.ok(store['ancial:pulse:artists:item-3']);
});
