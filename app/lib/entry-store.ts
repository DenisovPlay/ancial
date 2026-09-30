/**
 * Состояние страниц по записям истории браузера (прокрутка, черновики форм): «Назад/Вперёд» возвращает
 * пользователя туда, где он был. Ключ — идентификатор записи истории, значения делятся по пространствам имён.
 * Живёт в sessionStorage (как и сама история вкладки), память — только буфер записи.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface EntryStoreOptions {
  max?: number;
  prefix?: string;
}

type EntryRecord = Record<string, unknown>;

function isRecord(value: unknown): value is EntryRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createEntryStore(storage: StorageLike | null, options: EntryStoreOptions = {}) {
  const max = options.max ?? 40;
  const prefix = options.prefix ?? 'zypo:entry:';
  const indexKey = `${prefix}index`;
  const records = new Map<string, EntryRecord>();
  const dirty = new Set<string>();
  let order: string[] | null = null;

  const getOrder = () => {
    if (order) return order;
    order = [];
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(indexKey) ?? '[]');
      if (Array.isArray(parsed)) order = parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      // Битый индекс — начинаем с пустого.
    }
    return order;
  };

  const load = (key: string): EntryRecord => {
    const cached = records.get(key);
    if (cached) return cached;
    let record: EntryRecord = {};
    try {
      const parsed: unknown = JSON.parse(storage?.getItem(prefix + key) ?? 'null');
      if (isRecord(parsed)) record = parsed;
    } catch {
      // Битая запись — считаем, что состояния нет.
    }
    records.set(key, record);
    return record;
  };

  const touch = (key: string) => {
    const list = getOrder();
    const at = list.indexOf(key);
    if (at !== -1) list.splice(at, 1);
    list.push(key);
    while (list.length > max) {
      const evicted = list.shift();
      if (evicted === undefined) break;
      records.delete(evicted);
      dirty.delete(evicted);
      try {
        storage?.removeItem(prefix + evicted);
      } catch {
        // Не удалось убрать — не критично.
      }
    }
  };

  return {
    read<T>(ns: string, key: string): T | undefined {
      return load(key)[ns] as T | undefined;
    },
    write(ns: string, key: string, value: unknown) {
      load(key)[ns] = value;
      dirty.add(key);
      touch(key);
    },
    clear(ns: string, key: string) {
      const record = load(key);
      if (!(ns in record)) return;
      delete record[ns];
      dirty.add(key);
    },
    /** Убирает пространство имён из всех записей (например, при очистке кэша). */
    clearNamespace(ns: string) {
      for (const key of [...getOrder()]) {
        const record = load(key);
        if (ns in record) {
          delete record[ns];
          dirty.add(key);
        }
      }
    },
    clearAll() {
      for (const key of getOrder()) {
        try {
          storage?.removeItem(prefix + key);
        } catch {
          // Не удалось убрать — не критично.
        }
      }
      records.clear();
      dirty.clear();
      order = [];
      try {
        storage?.removeItem(indexKey);
      } catch {
        // Не удалось убрать — не критично.
      }
    },
    flush() {
      if (!storage) return;
      try {
        for (const key of dirty) {
          const record = records.get(key);
          if (record && Object.keys(record).length > 0) storage.setItem(prefix + key, JSON.stringify(record));
          else storage.removeItem(prefix + key);
        }
        storage.setItem(indexKey, JSON.stringify(getOrder()));
      } catch {
        // Переполнено хранилище — теряем только восстановление позиции.
      }
      dirty.clear();
    },
  };
}
