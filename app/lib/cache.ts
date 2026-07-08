'use client';

export type CacheCategory =
  | 'home'
  | 'feed'
  | 'chats'
  | 'wallet'
  | 'friends'
  | 'groups'
  | 'profile'
  | 'pulse'
  | 'notifications'
  | 'apps';

export type CacheSubcategory<C extends CacheCategory> =
  C extends 'home'
    ? 'currency' | 'weather'
    : C extends 'pulse'
    ? 'artists' | 'from_pulse' | 'listened' | 'now_listen' | 'we_like' | 'tracks' | 'favorites' | 'playlists' | 'artist_playlists' | 'offline_audio' | 'lyrics'
    : C extends 'wallet'
    ? 'overview' | 'merchants' | 'merchant_details' | 'accounts' | 'transactions' | 'history'
    : C extends 'chats'
    ? 'dialogs' | 'messages' | 'messages_hash' | 'previews'
    : C extends 'feed'
    ? 'posts'
    : C extends 'friends'
    ? 'list'
    : C extends 'groups'
    ? 'list' | 'profile'
    : C extends 'profile'
    ? 'profile_data'
    : C extends 'notifications'
    ? 'list'
    : C extends 'apps'
    ? 'home' | 'category' | 'search'
    : never;

export interface CacheOptions<C extends CacheCategory> {
  category: C;
  subcategory?: CacheSubcategory<C>;
  ttl?: number; // Time-to-Live in milliseconds
  raw?: boolean; // If true, store without envelope
  isPersistent?: boolean; // If true, mark envelope as persistent (never evict)
}

export interface CacheEnvelope<T> {
  __cacheEnvelope: true;
  value: T;
  createdAt: number;
  expiresAt?: number;
  category: CacheCategory;
  subcategory?: string;
  isPersistent?: boolean;
}

// Global set of keys that should never be deleted by normal cache clearing
// and are always stored in raw format (no envelope).
export const PERSISTENT_KEYS = new Set([
  'token',
  'pulse-volume',
  'pulse-eq-bands'
]);

export const SETTING_KEY_CACHE_TTL = 'ancial:cache_ttl_setting';
export const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Map legacy keys to their categories and subcategories
export const LEGACY_KEY_MAPPINGS: Record<string, { category: CacheCategory; subcategory?: string }> = {
  'friends_cache': { category: 'friends', subcategory: 'list' },
  'groups_cache': { category: 'groups', subcategory: 'list' },
  'notifications_cache': { category: 'notifications', subcategory: 'list' },
  'wallet_overview_cache': { category: 'wallet', subcategory: 'overview' },
  'wallet_merchants_cache': { category: 'wallet', subcategory: 'merchants' },
  'pulse_home_artists': { category: 'pulse', subcategory: 'artists' },
  'pulse_home_frompulse': { category: 'pulse', subcategory: 'from_pulse' },
  'pulse_home_listened': { category: 'pulse', subcategory: 'listened' },
  'pulse_home_nowlisten': { category: 'pulse', subcategory: 'now_listen' },
  'pulse_home_welike': { category: 'pulse', subcategory: 'we_like' },
  'pulse_fav_ids': { category: 'pulse', subcategory: 'favorites' },
  'dialogs-cache': { category: 'chats', subcategory: 'dialogs' },
};

/**
 * Resolves a cache key and its metadata from parameters.
 * Supports legacy keys and dynamic key naming patterns.
 */
export function resolveKeyInfo(
  key: string,
  options?: { category?: CacheCategory; subcategory?: string }
): {
  storageKey: string;
  category?: CacheCategory;
  subcategory?: string;
} {
  // Check if key is a global persistent key first!
  if (PERSISTENT_KEYS.has(key)) {
    return { storageKey: key };
  }

  // If options specify category/subcategory, construct the namespaced key
  if (options?.category) {
    const sub = options.subcategory ? `:${options.subcategory}` : '';
    return {
      storageKey: `ancial:${options.category}${sub}:${key}`,
      category: options.category,
      subcategory: options.subcategory,
    };
  }

  // Check if the key is already namespaced with "ancial:"
  if (key.startsWith('ancial:')) {
    const parts = key.split(':');
    if (parts.length >= 3) {
      const category = parts[1] as CacheCategory;
      if (parts.length === 3) {
        return { storageKey: key, category, subcategory: undefined };
      } else {
        return { storageKey: key, category, subcategory: parts[2] };
      }
    }
    return { storageKey: key };
  }

  // Check legacy map
  const legacyMapping = LEGACY_KEY_MAPPINGS[key];
  if (legacyMapping) {
    return {
      storageKey: key,
      category: legacyMapping.category,
      subcategory: legacyMapping.subcategory,
    };
  }

  // Check dynamic key patterns
  if (key.startsWith('lyrics:')) {
    return { storageKey: key, category: 'pulse', subcategory: 'lyrics' };
  }
  if (key.startsWith('msg-cache-hash:')) {
    return { storageKey: key, category: 'chats', subcategory: 'messages_hash' };
  }
  if (key.startsWith('msg-cache:')) {
    return { storageKey: key, category: 'chats', subcategory: 'messages' };
  }
  if (key.startsWith('preview_track_')) {
    return { storageKey: key, category: 'chats', subcategory: 'previews' };
  }
  if (key.startsWith('preview_post_')) {
    return { storageKey: key, category: 'chats', subcategory: 'previews' };
  }
  if (key.startsWith('wallet_merchant_detail_cache_')) {
    return { storageKey: key, category: 'wallet', subcategory: 'merchant_details' };
  }
  if (key.startsWith('wallet_account_cache_')) {
    return { storageKey: key, category: 'wallet', subcategory: 'accounts' };
  }
  if (key.startsWith('wallet_account_trans_cache_')) {
    return { storageKey: key, category: 'wallet', subcategory: 'transactions' };
  }
  if (key.startsWith('wallet_history_cache_')) {
    return { storageKey: key, category: 'wallet', subcategory: 'history' };
  }
  if (key.startsWith('playlist_tracks_gid_')) {
    return { storageKey: key, category: 'pulse', subcategory: 'tracks' };
  }
  if (key.startsWith('pulse_collection_')) {
    return { storageKey: key, category: 'pulse', subcategory: 'tracks' };
  }
  if (key.startsWith('apps_cache_')) {
    return { storageKey: key, category: 'apps', subcategory: key.startsWith('apps_cache_home') ? 'home' : key.startsWith('apps_cache_category_') ? 'category' : 'search' };
  }
  if (key.startsWith('group_cache_')) {
    return { storageKey: key, category: 'groups', subcategory: 'profile' };
  }
  if (key.startsWith('user_profile_cache:')) {
    return { storageKey: key, category: 'profile', subcategory: 'profile_data' };
  }
  if (key.startsWith('feed_cache:')) {
    return { storageKey: key, category: 'feed', subcategory: 'posts' };
  }

  return { storageKey: key };
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    e.code === 22 ||
    e.code === 1014 ||
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

/**
 * Remove all expired enveloped items from localStorage.
 */
function removeExpiredInternal() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;

    const raw = window.localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.__cacheEnvelope === true) {
          if (parsed.expiresAt && now > parsed.expiresAt) {
            keysToRemove.push(k);
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }
  }

  keysToRemove.forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // Ignore errors
    }
  });
}

/**
 * Evict oldest non-persistent cache items to free up space.
 */
function evictSpace(keyToSave: string): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Remove expired items first
  removeExpiredInternal();

  // 2. Gather all non-persistent items
  const itemsToEvict: Array<{ key: string; createdAt: number }> = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k || PERSISTENT_KEYS.has(k) || k === keyToSave) continue;

    const raw = window.localStorage.getItem(k);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.__cacheEnvelope === true) {
          if (parsed.isPersistent) continue;
          itemsToEvict.push({ key: k, createdAt: parsed.createdAt || 0 });
        } else {
          // Legacy keys are treated as non-persistent, oldest
          itemsToEvict.push({ key: k, createdAt: 0 });
        }
      } catch {
        // Raw strings (legacy non-JSON) are treated as non-persistent, oldest
        itemsToEvict.push({ key: k, createdAt: 0 });
      }
    }
  }

  if (itemsToEvict.length === 0) return false;

  // Sort by createdAt ascending (oldest first)
  itemsToEvict.sort((a, b) => a.createdAt - b.createdAt);

  // Evict the oldest item
  const oldest = itemsToEvict[0];
  try {
    window.localStorage.removeItem(oldest.key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to set a value in localStorage, evicting items if a quota exceeded error is encountered.
 */
function trySetItemWithEviction(key: string, valueStr: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(key, valueStr);
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return false;
    }
  }

  // Quota exceeded: loop and evict oldest non-persistent items one by one
  while (evictSpace(key)) {
    try {
      window.localStorage.setItem(key, valueStr);
      return true;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        return false;
      }
    }
  }

  return false;
}

const DB_NAME = 'ancial-offline-audio';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export const cache = {
  audio: {
    async has(trackId: number | string): Promise<boolean> {
      const db = await getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getKey(String(trackId));
          request.onsuccess = () => resolve(request.result !== undefined);
          request.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    },

    async get(trackId: number | string): Promise<Blob | null> {
      const db = await getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(String(trackId));
          request.onsuccess = () => {
            const data = request.result;
            resolve(data && data.blob instanceof Blob ? data.blob : null);
          };
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    },

    async save(
      trackId: number | string,
      url: string,
      metadata?: { title?: string; artist?: string }
    ): Promise<void> {
      if (await this.has(trackId)) {
        return; // Already cached
      }
      const db = await getDB();
      if (!db) return;

      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const blob = await response.blob();
        
        await new Promise<void>((resolve, reject) => {
          try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({
              id: String(trackId),
              blob,
              title: metadata?.title,
              artist: metadata?.artist,
              savedAt: Date.now(),
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          } catch (e) {
            reject(e);
          }
        });
      } catch (err) {
        console.error('Failed to cache audio file', err);
      }
    },

    async getDownloadedList(): Promise<Array<{ id: string; title?: string; artist?: string; size: number; savedAt: number }>> {
      const db = await getDB();
      if (!db) return [];
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();
          request.onsuccess = () => {
            const records = request.result || [];
            const list = records.map((record) => ({
              id: record.id,
              title: record.title,
              artist: record.artist,
              size: record.blob instanceof Blob ? record.blob.size : 0,
              savedAt: record.savedAt || 0,
            }));
            resolve(list);
          };
          request.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
    },

    async remove(trackId: number | string): Promise<void> {
      const db = await getDB();
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(String(trackId));
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    },

    async clear(): Promise<void> {
      const db = await getDB();
      if (!db) return;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    },

    async getCacheSize(): Promise<number> {
      const db = await getDB();
      if (!db) return 0;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();
          request.onsuccess = () => {
            const records = request.result || [];
            let totalBytes = 0;
            for (const record of records) {
              if (record && record.blob instanceof Blob) {
                totalBytes += record.blob.size;
              }
            }
            resolve(totalBytes);
          };
          request.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    }
  },

  /**
   * Retrieves a typed value from the cache. Handles backward compatibility.
   */
  get<T>(
    key: string,
    options?: { category?: CacheCategory; subcategory?: string; defaultValue?: T }
  ): T | null {
    if (typeof window === 'undefined') {
      return options?.defaultValue ?? null;
    }

    const { storageKey } = resolveKeyInfo(key, options);
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) {
      return options?.defaultValue ?? null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.__cacheEnvelope === true) {
        // Expiration check
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            // Ignore
          }
          return options?.defaultValue ?? null;
        }
        return parsed.value as T;
      }
      return parsed as T;
    } catch {
      // If parsing fails, it's a raw string (e.g. token)
      return raw as unknown as T;
    }
  },

  /**
   * Saves a value in the cache with the given category/subcategory and optional TTL.
   */
  set<T>(key: string, value: T, options: CacheOptions<CacheCategory>): void {
    if (typeof window === 'undefined') return;

    const { storageKey, category, subcategory } = resolveKeyInfo(key, options);
    const isPersistentKey = PERSISTENT_KEYS.has(storageKey);

    if (isPersistentKey || options.raw) {
      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
      trySetItemWithEviction(storageKey, valueStr);
      return;
    }

    const envelope: CacheEnvelope<T> = {
      __cacheEnvelope: true,
      value,
      createdAt: Date.now(),
      category: category || 'profile',
      subcategory,
    };

    if (options.ttl !== undefined) {
      if (options.ttl > 0) {
        envelope.expiresAt = Date.now() + options.ttl;
      }
    } else {
      let userTtl = DEFAULT_CACHE_TTL;
      try {
        const raw = window.localStorage.getItem(SETTING_KEY_CACHE_TTL);
        if (raw) {
          userTtl = parseInt(raw, 10);
        }
      } catch {}
      if (userTtl > 0) {
        envelope.expiresAt = Date.now() + userTtl;
      }
    }
    if (options.isPersistent) {
      envelope.isPersistent = true;
    }

    trySetItemWithEviction(storageKey, JSON.stringify(envelope));
  },

  /**
   * Removes a specific key from localStorage.
   */
  remove(key: string, options?: { category?: CacheCategory; subcategory?: string }): void {
    if (typeof window === 'undefined') return;

    const { storageKey } = resolveKeyInfo(key, options);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  },

  /**
   * Clears the cache. Can clear all caches, or a specific category/subcategory.
   * By default, preserves persistent keys like auth token and language.
   */
  clear(options?: {
    category?: CacheCategory;
    subcategory?: string;
    keepPersistent?: boolean;
  }): void {
    if (typeof window === 'undefined') return;

    const keepPersistent = options?.keepPersistent !== false;
    const category = options?.category;
    const subcategory = options?.subcategory;

    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;

      const isKeyPersistent = PERSISTENT_KEYS.has(k);
      let isEnvelopePersistent = false;

      if (!isKeyPersistent) {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && parsed.__cacheEnvelope === true && parsed.isPersistent) {
              isEnvelopePersistent = true;
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }

      const isPersistent = isKeyPersistent || isEnvelopePersistent;

      if (keepPersistent && isPersistent) {
        continue;
      }

      if (category) {
        const info = resolveKeyInfo(k);
        if (info.category !== category) {
          continue;
        }
        if (subcategory && info.subcategory !== subcategory) {
          continue;
        }
      }

      keysToRemove.push(k);
    }

    keysToRemove.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // Ignore
      }
    });

    if (!category || category === 'pulse') {
      this.audio.clear().catch((err) => {
        console.error('Failed to clear audio cache in IndexedDB:', err);
      });
    }
  },

  /**
   * Explicitly triggers removal of all expired enveloped items.
   */
  removeExpired(): void {
    removeExpiredInternal();
  },

  /**
   * Returns details about keys, total size in characters, and item counts per category.
   */
  getInfo(): {
    totalSize: number;
    keysCount: number;
    byCategory: Record<string, number>;
  } {
    if (typeof window === 'undefined') {
      return { totalSize: 0, keysCount: 0, byCategory: {} };
    }

    let totalSize = 0;
    let keysCount = 0;
    const byCategory: Record<string, number> = {};

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;

      const val = window.localStorage.getItem(k) || '';
      totalSize += k.length + val.length;
      keysCount++;

      const info = resolveKeyInfo(k);
      const cat = info.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    return { totalSize, keysCount, byCategory };
  },
};
