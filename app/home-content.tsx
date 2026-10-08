'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './context/AuthContext';
import { sanitizeUserHtml } from './lib/sanitize-html';
import { classifySearchInput, searchHref } from './lib/search-query';
import {
  readCachedCurrency,
  readCachedWeather,
  readLastCity,
  writeLastCity,
  readWeatherBackup,
  writeWeatherBackup,
  readCurrencyBackup,
  writeCurrencyBackup,
  type HomeCurrencyCacheData,
  type HomeWeatherCacheData,
  writeCachedCurrency,
  writeCachedWeather,
} from './lib/home-info-cache';
import { safeFetchJson } from './lib/safe-fetch-json';
import SearchBox from './components/search-box';
import WeatherMarkerOnboarding from './components/weather-marker-onboarding';
import AppImage from './components/app-image';
import Icon from './components/svg-icon';
import SearchContent from './search/search-content';

interface HomeApiResponse<T> {
  success: boolean;
  data: T | null;
}

interface LocationData {
  city: string | null;
}

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { langCode } = useAuth();

  const [currencies, setCurrencies] = useState<HomeCurrencyCacheData | null>(null);
  const [weather, setWeather] = useState<HomeWeatherCacheData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  // ─── Currency: кэш → показ → фоновое обновление ──────────────────────────
  useEffect(() => {
    // 1. Мгновенно показываем закэшированное
    let cachedCurrency = readCachedCurrency();
    if (!cachedCurrency) {
      try { cachedCurrency = readCurrencyBackup(); } catch { }
    }
    // SWR: мгновенный показ кэша до фоновой перезаливки — сеттлер здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cachedCurrency) setCurrencies(cachedCurrency);

    // 2. Фоновое обновление (не ждём)
    void (async () => {
      try {
        const res = await safeFetchJson<HomeApiResponse<HomeCurrencyCacheData>>('/api/V2/info/GetCurrency.php');
        if (res?.success && res.data) {
          const ratesData = { usd: res.data.usd, eur: res.data.eur };
          setCurrencies(ratesData);
          writeCachedCurrency(ratesData);
          try { writeCurrencyBackup(ratesData); } catch { }
        }
      } catch (err) {
        console.error('[Currency] Fetch failed', err);
        // Если вообще ничего нет — попробуем бэкап ещё раз
        if (!cachedCurrency) {
          try {
            const backup = readCurrencyBackup();
            if (backup) setCurrencies(backup);
          } catch { }
        }
      }
    })();
  }, []);

  // ─── Weather: кэш → показ → фоновое обновление (полностью независимо от курсов)
  useEffect(() => {
    // 1. Мгновенно показываем из кэша, если есть
    let hadCache = false;
    try {
      const lastCity = readLastCity();
      let cachedWeather: HomeWeatherCacheData | null = null;
      if (lastCity) cachedWeather = readCachedWeather(lastCity);
      if (!cachedWeather) {
        try { cachedWeather = readWeatherBackup(); } catch { }
      }
      if (cachedWeather) {
        // SWR: мгновенный показ кэша до фоновой перезаливки — сеттлер здесь источник правды.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWeather(cachedWeather);
        hadCache = true;
      }
    } catch { }

    if (!hadCache) setWeatherLoading(true);

    // 2. Фоновое обновление: геолокация + погода (не ждём курсы)
    void (async () => {
      try {
        // Офлайн — только кэш, не идём в сеть
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          if (!hadCache) {
            try {
              const backup = readWeatherBackup();
              if (backup) setWeather(backup);
            } catch { }
          }
          return;
        }

        // Определяем город
        let city = '';
        try {
          const locationRes = await safeFetchJson<HomeApiResponse<LocationData>>('/api/V2/info/GetLocation.php');
          if (locationRes?.success && locationRes.data?.city) {
            city = locationRes.data.city;
            try { writeLastCity(city); } catch { }
          }
        } catch (locationErr) {
          console.error('[Location] Fetch failed', locationErr);
        }

        // Фоллбэк: последний известный город
        if (!city) {
          try { city = readLastCity() ?? ''; } catch { }
        }

        if (!city) {
          // Совсем ничего нет — показываем бэкап
          try {
            const backup = readWeatherBackup();
            if (backup) setWeather(backup);
          } catch { }
          return;
        }

        // Запрашиваем погоду
        const weatherRes = await safeFetchJson<HomeApiResponse<HomeWeatherCacheData>>(
          `/api/V2/info/Weather.php?city=${encodeURIComponent(city)}`
        );
        if (weatherRes?.success && weatherRes.data) {
          const wd = { temp: weatherRes.data.temp, wfont: weatherRes.data.wfont };
          setWeather(wd);
          writeCachedWeather(city, weatherRes.data);
          try { writeWeatherBackup(weatherRes.data); } catch { }
        } else if (!hadCache) {
          try {
            const backup = readWeatherBackup();
            if (backup) setWeather(backup);
          } catch { }
        }
      } catch (err) {
        console.error('[Weather/Location] Process failed', err);
        if (!hadCache) {
          try {
            const backup = readWeatherBackup();
            if (backup) setWeather(backup);
          } catch { }
        }
      } finally {
        setWeatherLoading(false);
      }
    })();
  }, []);


  const handleSearch = (input: string) => {
    const parsed = classifySearchInput(input);
    if (parsed.kind === 'url') {
      window.open(parsed.url, '_blank', 'noopener,noreferrer');
    } else if (parsed.kind === 'query') {
      router.push(searchHref(parsed.query));
    }
  };

  return (
    <div className="home-route relative isolate h-screen min-h-screen max-h-screen h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex flex-col items-center overflow-hidden overscroll-none duration-300">
      {/* 1. Главная (скрыта, пока задан запрос) */}
      <div className={`w-full h-full flex flex-col items-center justify-center p-3 md:p-0 gap-3 absolute inset-0 duration-300 transition-opacity ${queryParam ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
        {/* Backgrounds */}
        <video
          id="videobackground"
          autoPlay
          muted
          loop
          preload="none"
          playsInline
          className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-0 lg:opacity-50 duration-300 pointer-events-none select-none"
          src="/img/backgrounds/ygX.mp4"
        />
        <Image
          src="/img/backgrounds/bg.webp"
          fill
          alt="Background"
          sizes="100vw"
          className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-40 lg:opacity-0 duration-300 pointer-events-none select-none"
          draggable={false}
          priority
        />

        {/* Welcome Notification Card */}
        <motion.div
          initial={false}
          animate={{ opacity: queryParam ? 0 : 1, y: queryParam ? -20 : 0 }}
          transition={{ duration: 0.3 }}
          className="-mt-32 w-full max-w-screen-md flex items-center gap-3 relative z-10 select-none"
        >
          {/* Высота фиксирована: логотип уезжает в шапку выдачи (layoutId), а карточка не схлопывается. */}
          <div className="flex h-8 flex-col items-center justify-center text-center w-full lg:h-10">
            {!queryParam && (
              <motion.div layoutId="home-logo" transition={{ type: 'spring', stiffness: 600, damping: 50 }} className="inline-flex">
                <AppImage width={132} height={40} loading="eager" src="/img/zypo/letter.svg" className='h-8 lg:h-10 w-auto inline pointer-events-none select-none' draggable={false} alt="Zypo" />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Search Input Container */}
        {!queryParam && (
          <motion.div layoutId="search-bar" transition={{ type: 'spring', stiffness: 600, damping: 50 }} className="relative flex w-full max-w-screen-md flex-col z-[99999]">
            <SearchBox onSearch={handleSearch} />
          </motion.div>
        )}

        {/* Information Widgets below Search */}
        <motion.div
          initial={false}
          animate={{ opacity: queryParam ? 0 : 1, y: queryParam ? 20 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-screen-md flex items-center gap-3 opacity-80 z-10 text-sm"
        >
          {/* Weather Widget */}
          <WeatherMarkerOnboarding>
            <Link
              suppressHydrationWarning
              href="/apps/overlay/weather"
              className="flex items-center justify-center gap-1.5 cursor-pointer duration-300 active:scale-95 hover:bg-zinc-800/70 hover:px-2 py-0.5 rounded-full border border-transparent hover:border-zinc-600/30 transition-all"
            >
              {weatherLoading ? (
                <Icon name="IC-loader" className="w-5 h-5 inline animate-spin fill-zinc-300" />
              ) : weather && weather.wfont ? (
                <span
                  suppressHydrationWarning
                  className="flex items-center justify-center w-5 h-5 shrink-0 animate-fade-in"
                  dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(weather.wfont) }}
                />
              ) : (
                <Icon name="IC-weather-default" suppressHydrationWarning className="w-5 h-5 fill-white inline animate-fade-in" />
              )}
              <span suppressHydrationWarning className="text-white font-medium">
                {weatherLoading ? '' : (weather?.temp !== null && weather?.temp !== undefined ? `${weather.temp}°C` : '')}
              </span>
            </Link>
          </WeatherMarkerOnboarding>

          {/* Currency Rates Widgets (ru language only) */}
          {langCode === 'ru' && currencies && (
            <>
              {/* USD Widget */}
              <div className="flex items-center justify-center gap-1">
                <Icon name="IC-dollar" className="w-4 h-4 fill-zinc-400 inline" />
                <span className="text-zinc-300 font-medium">{currencies.usd || ''}</span>
              </div>

              {/* EUR Widget */}
              <div className="flex items-center justify-center gap-1">
                <Icon name="IC-euro" className="w-4 h-4 fill-zinc-400 inline" />
                <span className="text-zinc-300 font-medium">{currencies.eur || ''}</span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* 2. Выдача (рисуется поверх, пока задан запрос; шапка с логотипом и строкой — общая с главной по layoutId) */}
      <div className={`w-full h-full overflow-y-auto absolute inset-0 duration-300 transition-opacity ${queryParam ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
        {queryParam ? <SearchContent /> : null}
      </div>
    </div>
  );
}
