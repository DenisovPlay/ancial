const CACHE_KEY = 'lang_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export function getLangFromCache(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached) as {
      data: Record<string, string>;
      timestamp: number;
    };

    if (Date.now() - timestamp > CACHE_DURATION) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function saveLangToCache(lang: Record<string, string>) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: lang, timestamp: Date.now() }),
    );
  } catch {
    // Игнорируем ошибки кэширования
  }
}
