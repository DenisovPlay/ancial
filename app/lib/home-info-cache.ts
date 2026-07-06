import { cache } from './cache.ts';

export interface HomeCurrencyCacheData {
  usd: string | null;
  eur: string | null;
}

export interface HomeWeatherCacheData {
  temp: number | null;
  wfont: string | null;
}

export const HOME_INFO_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

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
    ttl: HOME_INFO_CACHE_TTL_MS,
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
    ttl: HOME_INFO_CACHE_TTL_MS,
  });
}
