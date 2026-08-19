import { useEffect, useState } from 'react';
import { readCachedCountry, writeCachedCountry } from './geo-cache';

interface GetCountryResponse {
  success: boolean;
  data?: { country_code?: string } | null;
}

let _resolvedPromise: Promise<string> | null = null;

/**
 * Возвращает промис с ISO-кодом страны (e.g. "RU", "US", "NL").
 * Всегда возвращает хотя бы "RU" как дефолт.
 */
export function getUserCountry(): Promise<string> {
  if (_resolvedPromise) return _resolvedPromise;

  _resolvedPromise = (async (): Promise<string> => {
    // 1. Мгновенный ответ из кэша
    const cached = readCachedCountry();
    if (cached) return cached;

    // 2. Сетевой запрос
    try {
      const res = await fetch('https://backend.ru.zypo.cc/api/V2/info/GetCountry.php', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        // 4 секунды — достаточно для геолокации, не блокируем UI надолго
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = (await res.json()) as GetCountryResponse;
        const code = json?.data?.country_code?.trim().toUpperCase();
        if (code && /^[A-Z]{2,3}$/.test(code)) {
          writeCachedCountry(code);
          return code;
        }
      }
    } catch (err) {
      console.warn('[UserGeo] GetCountry.php failed, defaulting to RU', err);
    }

    return 'RU';
  })();

  // Если промис упал — сбрасываем, чтобы следующий вызов повторил попытку
  _resolvedPromise.catch(() => {
    _resolvedPromise = null;
  });

  return _resolvedPromise;
}

/**
 * Синхронный геттер — возвращает закэшированное значение или 'RU'.
 * Безопасен для использования вне async-контекста (первый рендер).
 */
export function getUserCountrySync(): string {
  return readCachedCountry() ?? 'RU';
}

/**
 * React-хук для получения актуального кода страны пользователя.
 * Возвращает кэшированное значение сразу и обновляет при завершении запроса.
 */
export function useUserCountry(): string {
  const [country, setCountry] = useState<string>(() => getUserCountrySync());

  useEffect(() => {
    let active = true;
    getUserCountry()
      .then((code) => {
        if (active && code) {
          setCountry(code);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return country;
}
