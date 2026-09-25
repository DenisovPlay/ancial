/**
 * Запись в localStorage с вытеснением старых записей при переполнении.
 *
 * Раньше на каждую удаляемую запись хранилище (до 5 МБ) заново читалось и разбиралось целиком —
 * квадратичная работа и секунды зависания на слабых телефонах. Здесь один проход: собираем
 * кандидатов, сортируем по возрасту и удаляем по одному самых старых, пока запись не пройдёт.
 * Порядок вытеснения прежний: сначала просроченные, затем старейшие не-персистентные
 * (легаси-ключи и не-JSON считаются самыми старыми).
 */

export type EvictableStorage = Pick<Storage, 'getItem' | 'key' | 'removeItem' | 'setItem' | 'length'>;

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    e.code === 22 ||
    e.code === 1014 ||
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

type Candidates = {
  expired: string[];
  /** От старых к новым. */
  evictable: string[];
};

function collectCandidates(
  storage: EvictableStorage,
  keyToSave: string,
  persistentKeys: ReadonlySet<string>,
  now: number,
): Candidates {
  const expired: string[] = [];
  const items: Array<{ key: string; createdAt: number }> = [];

  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k) continue;
    const raw = storage.getItem(k);
    if (!raw) continue;

    let parsed: unknown = null;
    let isJson = true;
    try {
      parsed = JSON.parse(raw);
    } catch {
      isJson = false;
    }

    const envelope = isJson && parsed && typeof parsed === 'object'
      ? (parsed as { __cacheEnvelope?: unknown; createdAt?: unknown; expiresAt?: unknown; isPersistent?: unknown })
      : null;
    const isEnvelope = envelope?.__cacheEnvelope === true;

    // Просроченные удаляются всегда — как и раньше, даже персистентные и сохраняемый ключ.
    if (isEnvelope && envelope.expiresAt && now > Number(envelope.expiresAt)) {
      expired.push(k);
      continue;
    }

    if (persistentKeys.has(k) || k === keyToSave) continue;
    if (isEnvelope) {
      if (envelope.isPersistent) continue;
      items.push({ key: k, createdAt: Number(envelope.createdAt) || 0 });
    } else {
      // Легаси-значения (не конверт или не JSON) — самые старые.
      items.push({ key: k, createdAt: 0 });
    }
  }

  // Стабильная сортировка: при равном возрасте порядок как в хранилище (как было).
  items.sort((a, b) => a.createdAt - b.createdAt);
  return { expired, evictable: items.map((item) => item.key) };
}

function trySet(storage: EvictableStorage, key: string, value: string): 'ok' | 'quota' | 'error' {
  try {
    storage.setItem(key, value);
    return 'ok';
  } catch (error) {
    return isQuotaExceededError(error) ? 'quota' : 'error';
  }
}

function tryRemove(storage: EvictableStorage, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function setItemWithEviction(
  storage: EvictableStorage,
  key: string,
  value: string,
  persistentKeys: ReadonlySet<string>,
  now = Date.now(),
): boolean {
  const first = trySet(storage, key, value);
  if (first !== 'quota') return first === 'ok';

  const { expired, evictable } = collectCandidates(storage, key, persistentKeys, now);

  if (expired.length > 0) {
    expired.forEach((k) => tryRemove(storage, k));
    const afterExpired = trySet(storage, key, value);
    if (afterExpired !== 'quota') return afterExpired === 'ok';
  }

  for (const k of evictable) {
    if (!tryRemove(storage, k)) return false;
    const result = trySet(storage, key, value);
    if (result !== 'quota') return result === 'ok';
  }

  return false;
}
