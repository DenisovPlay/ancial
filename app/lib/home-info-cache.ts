import { cache } from './cache.ts';

export interface HomeCurrencyCacheData {
  usd: string | null;
  eur: string | null;
}

export interface HomeWeatherCacheData {
  temp: number | null;
  wfont: string | null;
}

export function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

const CURRENCY_CACHE_KEY = 'rates';

function getWeatherCacheKey(city: string) {
  return `city:${city.trim()}`;
}

export function readCachedCurrency() {
  return cache.get<HomeCurrencyCacheData>(CURRENCY_CACHE_KEY, {
    category: 'home',
    subcategory: 'currency',
  });
}

export function writeCachedCurrency(value: HomeCurrencyCacheData) {
  cache.set(CURRENCY_CACHE_KEY, value, {
    category: 'home',
    subcategory: 'currency',
    ttl: getMsUntilMidnight(),
  });
}

export function readCachedWeather(city: string) {
  return cache.get<HomeWeatherCacheData>(getWeatherCacheKey(city), {
    category: 'home',
    subcategory: 'weather',
  });
}

export function writeCachedWeather(city: string, value: HomeWeatherCacheData) {
  cache.set(getWeatherCacheKey(city), value, {
    category: 'home',
    subcategory: 'weather',
    ttl: getMsUntilMidnight(),
  });
}

// ─── Вспомогательные ключи. ВАЖНО: чтение и запись обязаны использовать одинаковые
// options, иначе resolveKeyInfo даёт разные storageKey и кэш «не находится».

const LAST_CITY_KEY = 'last_city';
const WEATHER_BACKUP_KEY = 'weather_backup';
const CURRENCY_BACKUP_KEY = 'rates_backup';

export function readLastCity(): string | null {
  return cache.get<string>(LAST_CITY_KEY, { category: 'home' });
}

export function writeLastCity(city: string): void {
  cache.set(LAST_CITY_KEY, city, { category: 'home' });
}

export function readWeatherBackup(): HomeWeatherCacheData | null {
  return cache.get<HomeWeatherCacheData>(WEATHER_BACKUP_KEY, { category: 'home' });
}

export function writeWeatherBackup(value: HomeWeatherCacheData): void {
  // Без TTL: это «последняя известная погода» для офлайна/холодного старта.
  cache.set(WEATHER_BACKUP_KEY, value, { category: 'home' });
}

export function readCurrencyBackup(): HomeCurrencyCacheData | null {
  return cache.get<HomeCurrencyCacheData>(CURRENCY_BACKUP_KEY, { category: 'home' });
}

export function writeCurrencyBackup(value: HomeCurrencyCacheData): void {
  cache.set(CURRENCY_BACKUP_KEY, value, { category: 'home' });
}
