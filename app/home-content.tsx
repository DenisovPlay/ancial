'use client';

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Script from 'next/script';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { useNotification } from './context/NotificationContext';
import { createGoogleCseSearchController, type GoogleCseElement } from './lib/google-cse';
import {
  readCachedCurrency,
  readCachedWeather,
  type HomeCurrencyCacheData,
  type HomeWeatherCacheData,
  writeCachedCurrency,
  writeCachedWeather,
} from './lib/home-info-cache';
import { safeFetchJson } from './lib/safe-fetch-json';

interface HomeApiResponse<T> {
  success: boolean;
  data: T | null;
}

interface LocationData {
  city: string | null;
}

type GoogleSuggestionsPayload = [string, string[]];

type HomeWindow = Window &
  typeof globalThis &
  Record<string, unknown> & {
    google?: {
      search?: {
        cse?: {
          element?: {
            getElement: (name: string) => { execute: (query: string) => void } | null;
            render: (options: any) => void;
          };
        };
      };
    };
  };

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { lang } = useAuth();
  const { showNote } = useNotification();

  const [searchVal, setSearchVal] = useState(queryParam);
  const [imageModal, setImageModal] = useState<{ src: string; title: string; url: string; pageUrl: string } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [currencies, setCurrencies] = useState<HomeCurrencyCacheData | null>(null);
  const [weather, setWeather] = useState<HomeWeatherCacheData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  const activeScriptIdRef = useRef<string | null>(null);
  const activeCallbackRef = useRef<string | null>(null);
  const cseControllerRef = useRef<ReturnType<typeof createGoogleCseSearchController> | null>(null);
  const isNavigatingRef = useRef(false);
  const gnameRef = useRef(`gcs-${Math.round(Math.random() * 1000000)}`);

  if (!cseControllerRef.current && typeof window !== 'undefined') {
    cseControllerRef.current = createGoogleCseSearchController({
      getElement: () => {
        const google = (window as HomeWindow).google;
        if (!google?.search?.cse?.element) return null;

        const gname = gnameRef.current;
        let cse = google.search.cse.element.getElement(gname);

        if (!cse) {
          try {
            const container = document.getElementById('gcs-container');
            if (container && container.innerHTML === '') {
              google.search.cse.element.render({
                div: 'gcs-container',
                tag: 'searchresults-only',
                gname: gname
              });
              cse = google.search.cse.element.getElement(gname);
            }
          } catch (e) {
            console.error('Failed to render GCS', e);
          }
        }

        return cse as GoogleCseElement | null;
      },
    });
  }

  // Sync state if URL query param changes
  useEffect(() => {
    setSearchVal(queryParam);
    if (!queryParam) {
      setShowSuggestions(false);
    }
  }, [queryParam]);

  // Trigger Google Custom Search programmatic execution when queryParam changes
  useEffect(() => {
    cseControllerRef.current?.syncQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    return () => {
      cseControllerRef.current?.dispose();
    };
  }, []);

  // Intercept GCS image thumbnail clicks → show custom modal instead of GCS native preview
  useEffect(() => {
    if (!queryParam) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.gsc-imageResult.gsc-result') as HTMLElement | null;
      if (!card) return;

      // Prevent GCS from doing its own preview logic
      e.stopPropagation();
      e.preventDefault();

      const img = card.querySelector('img.gs-image') as HTMLImageElement | null;
      const link = card.querySelector('a.gs-image') as HTMLAnchorElement | null;
      const dataLink = card.querySelector('[data-ctorig]') as HTMLElement | null;

      const src = img?.src || '';
      const pageUrl = link?.href || dataLink?.getAttribute('data-ctorig') || '';
      // Try to get title from parent anchor title or aria-label
      const title = link?.title || link?.getAttribute('aria-label') || img?.alt || '';

      if (!src) return;

      setImageModal({ src, title, url: pageUrl, pageUrl });
    };

    // Attach listener on document with capture so we fire before GCS
    document.addEventListener('click', handleImageClick, true);
    return () => document.removeEventListener('click', handleImageClick, true);
  }, [queryParam]);

  // Fetch exchange rates and weather info

  useEffect(() => {
    const cachedCurrency = readCachedCurrency();
    if (cachedCurrency) {
      setCurrencies(cachedCurrency);
    }

    void (async () => {
      try {
        if (!cachedCurrency) {
          const currencyRes = await safeFetchJson<HomeApiResponse<HomeCurrencyCacheData>>('/api/V2/info/GetCurrency.php');

          if (!currencyRes) {
            console.info('[Currency] Legacy endpoint returned an empty or non-JSON response');
          } else if (currencyRes.success && currencyRes.data) {
            setCurrencies({
              usd: currencyRes.data.usd,
              eur: currencyRes.data.eur,
            });
            writeCachedCurrency(currencyRes.data);
          }
        }
      } catch (currencyErr) {
        console.error('[Currency] Fetch failed', currencyErr);
      }

      try {
        const locationRes = await safeFetchJson<HomeApiResponse<LocationData>>('/api/V2/info/GetLocation.php');

        if (!locationRes) {
          console.info('[Location] Legacy endpoint returned an empty or non-JSON response');
          setWeatherLoading(false);
          return;
        }

        if (!locationRes.success || !locationRes.data?.city) {
          setWeatherLoading(false);
          return;
        }

        const cachedWeather = readCachedWeather(locationRes.data.city);
        if (cachedWeather) {
          setWeather(cachedWeather);
          setWeatherLoading(false);
          return;
        }

        const weatherRes = await safeFetchJson<HomeApiResponse<HomeWeatherCacheData>>(
          `/api/V2/info/Weather.php?city=${encodeURIComponent(locationRes.data.city)}`
        );

        if (!weatherRes) {
          console.info('[Weather] Legacy endpoint returned an empty or non-JSON response');
          setWeatherLoading(false);
          return;
        }

        if (weatherRes.success && weatherRes.data) {
          setWeather({
            temp: weatherRes.data.temp,
            wfont: weatherRes.data.wfont,
          });
          writeCachedWeather(locationRes.data.city, weatherRes.data);
        }
      } catch (locationErr) {
        console.error('[Location] Fetch failed', locationErr);
      } finally {
        setWeatherLoading(false);
      }
    })();
  }, []);

  // Autocomplete debounced suggestion fetch
  useEffect(() => {
    const trimmed = searchVal.trim();
    if (trimmed === '') {
      setSuggestions([]);
      return;
    }

    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const lowerQuery = trimmed.toLowerCase();
      const disallowed = ['русня', 'хохлы', 'укропы', 'топчу ру', 'чурки', 'хачи', 'москал'];
      const homeWindow = window as HomeWindow;
      if (disallowed.some((term) => lowerQuery.includes(term))) {
        setSuggestions([]);
        showNote({
          content: 'Будьте добрее к другим людям!',
          type: 'error',
          time: 5,
        });
        return;
      }

      const callbackName = `searchHelp_${Math.round(Math.random() * 1000000)}`;

      // Clean up previous call script and callback to avoid leaks
      if (activeScriptIdRef.current) {
        const prevScript = document.getElementById(activeScriptIdRef.current);
        prevScript?.remove();
        const prevCallback = activeCallbackRef.current;
        if (prevCallback) {
          delete homeWindow[prevCallback];
        }
      }

      activeScriptIdRef.current = callbackName;
      activeCallbackRef.current = callbackName;

      homeWindow[callbackName] = (data: unknown) => {
        if (Array.isArray(data) && Array.isArray(data[1])) {
          const [, payload] = data as GoogleSuggestionsPayload;
          const googleSuggestions = payload.filter((item) => typeof item === 'string');
          const combined = [
            trimmed,
            ...googleSuggestions.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()).slice(0, 3)
          ];
          setSuggestions(combined);
          setFocusedIndex(0);
        }
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestqueries.google.com/complete/search?client=chrome&hl=ru&q=${encodeURIComponent(
        trimmed
      )}&callback=${callbackName}`;
      document.head.appendChild(script);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [searchVal, showNote]);

  // Clean up JSONP callbacks on unmount
  useEffect(() => {
    return () => {
      if (activeScriptIdRef.current) {
        const prevScript = document.getElementById(activeScriptIdRef.current);
        prevScript?.remove();
      }
      const prevCallback = activeCallbackRef.current;
      if (prevCallback) {
        delete (window as HomeWindow)[prevCallback];
      }
    };
  }, []);

  const handleSearch = (val: string) => {
    const query = val.trim();
    if (!query) return;

    setShowSuggestions(false);

    // Blur active input to prevent outline focus and keyboard staying open
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    // Remove browser selection to prevent "выделяется страница какого-то хуя"
    window.getSelection()?.removeAllRanges();

    // Is link check
    const urlPattern = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(com|ru|net|org|io|kz|рф)[^\s]*)$/i;
    if (urlPattern.test(query)) {
      let targetUrl = query;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    router.push('/?q=' + encodeURIComponent(query));
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch(searchVal);
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = focusedIndex < suggestions.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(nextIdx);
      isNavigatingRef.current = true;
      setSearchVal(suggestions[nextIdx]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = focusedIndex > 0 ? focusedIndex - 1 : suggestions.length - 1;
      setFocusedIndex(nextIdx);
      isNavigatingRef.current = true;
      setSearchVal(suggestions[nextIdx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        selectSuggestion(suggestions[focusedIndex]);
      } else {
        handleSearch(searchVal);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (val: string) => {
    setSearchVal(val);
    handleSearch(val);
  };

  const searchBarContent = (
    <>
      <form onSubmit={handleSearchSubmit} className="flex justify-center items-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 relative z-[11]">
        <input
          value={searchVal}
          onChange={(e) => {
            isNavigatingRef.current = false;
            setSearchVal(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleSearchKeyDown}
          className="bg-transparent w-full focus:ring-0 pl-3 placeholder-zinc-600 text-white outline-hidden border-none h-full"
          placeholder={lang?.search || 'Поиск...'}
          autoComplete="off"
        />
        <button
          type="submit"
          aria-label="Search"
          className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700"
        >
          <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <use href="/icons.svg#IC-search"></use>
          </svg>
        </button>
      </form>

      {suggestions.length > 0 && showSuggestions && (
        <div className="absolute top-0 rounded-3xl flex flex-col gap-1 w-full pt-14 z-[10]">
          {suggestions.map((suggestion, idx) => {
            const isFocused = idx === focusedIndex;
            return (
              <span
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(suggestion);
                }}
                className={`border border-zinc-600/30 overflow-hidden shadow backdrop-blur-lg backdrop-saturate-200 rounded-3xl w-full p-2 cursor-pointer active:scale-95 duration-300 ${isFocused ? 'bg-zinc-800' : 'bg-zinc-900/80'
                  } hover:bg-zinc-800/90 text-white`}
              >
                {suggestion}
              </span>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="home-route relative isolate h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex flex-col items-center overflow-hidden overscroll-none duration-300">

      {/* 1. Landing page view (hidden when queryParam is set) */}
      <div className={`w-full h-full flex flex-col items-center justify-center p-3 md:p-0 gap-3 absolute inset-0 duration-300 transition-opacity ${queryParam ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}`}>
        {/* Backgrounds */}
        <video
          id="videobackground"
          autoPlay
          muted
          loop
          preload="none"
          playsInline
          className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-0 lg:opacity-50 duration-300"
          src="/img/backgrounds/ygX.mp4"
        />
        <Image
          src="/img/backgrounds/bg.webp"
          fill
          alt="Background"
          sizes="100vw"
          className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-40 lg:opacity-0 duration-300"
          priority
        />

        {/* Welcome Notification Card */}
        <motion.div
          initial={false}
          animate={{ opacity: queryParam ? 0 : 1, y: queryParam ? -20 : 0 }}
          transition={{ duration: 0.3 }}
          className="-mt-32 /hidden bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-3xl w-full max-w-screen-md p-3 flex items-center gap-3 shadow relative z-10"
        >
          <div className="flex flex-col w-full">
            <span className="text-lg lg:text-2xl font-bold">Свершилось! Ancial теперь на React!</span>
            <span className="text-sm lg:text-base text-zinc-300">
              Мы всё ещё продолжаем разработку, поэтому вы можете встречать баги и недоработки.
            </span>
            <span className="text-xs lg:text-sm text-zinc-400">
              Совсем скоро мы вернём привычный функционал, а пока наслаждайтесь обновлённым интерфейсом!
            </span>
            <div className="flex items-center justify-end gap-3 mt-1.5">
              <a
                href="https://t.me/ancialru"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-400 hover:bg-blue-500 duration-300 active:scale-95 shadow border border-zinc-600/30"
              >
                <img className="w-3.5 h-3.5" src="/img/socials/tg.png" alt="Telegram" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Search Input Container */}
        {!queryParam && (
          <motion.div layoutId="search-bar" transition={{ type: "spring", stiffness: 600, damping: 50 }} className="flex flex-col gap-1 relative w-full max-w-screen-md z-[99999]">
            {searchBarContent}
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
          <div
            onClick={() => router.push('/apps/overlay/weather')}
            className="flex items-center justify-center gap-1.5 cursor-pointer duration-300 active:scale-95 hover:bg-zinc-800/70 hover:px-2 py-0.5 rounded-full border border-transparent hover:border-zinc-600/30 transition-all"
          >
            {weatherLoading ? (
              <svg className="w-5 h-5 inline animate-spin fill-zinc-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <use href="/icons.svg#IC-auth-loader"></use>
              </svg>
            ) : weather && weather.wfont ? (
              <span
                className="flex items-center justify-center w-5 h-5 shrink-0 animate-fade-in"
                dangerouslySetInnerHTML={{ __html: weather.wfont }}
              />
            ) : (
              <svg className="w-5 h-5 fill-white inline animate-fade-in" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <use href="/icons.svg#IC-weather-default"></use>
              </svg>
            )}
            <span className="text-white font-medium">
              {weatherLoading ? '' : (weather?.temp !== null && weather?.temp !== undefined ? `${weather.temp}°C` : '')}
            </span>
          </div>

          {/* Currency Rates Widgets (ru language only) */}
          {lang?.langname === 'ru' && currencies && (
            <>
              {/* USD Widget */}
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4 fill-zinc-400 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <use href="/icons.svg#IC-dollar"></use>
                </svg>
                <span className="text-zinc-300 font-medium">{currencies.usd || ''}</span>
              </div>

              {/* EUR Widget */}
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4 fill-zinc-400 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <use href="/icons.svg#IC-euro"></use>
                </svg>
                <span className="text-zinc-300 font-medium">{currencies.eur || ''}</span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* 2. Search Results View (persists in DOM, only hidden when q is empty) */}
      <div className={`w-full h-screen overflow-y-auto flex flex-col items-center lg:items-start p-3 pt-0 gap-3 absolute inset-0 duration-300 transition-opacity ${queryParam ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
        <Script
          id="google-cse"
          async
          src="https://cse.google.com/cse.js?cx=eb137b61a6e228fd9"
          strategy="afterInteractive"
          onReady={() => {
            cseControllerRef.current?.notifyScriptReady();
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
          /* === Base containers === */
          .gcse-searchresults-only{ min-height:max-content; }
          #___gcse_0, .gsc-control-cse, .gsc-control-wrapper-cse,
          .gsc-results-wrapper-nooverlay, .gsc-results-wrapper-visible,
          .gsc-positioningWrapper, .gsc-wrapper,
          .gsc-resultsbox-visible, .gsc-resultsRoot{
              background:transparent !important;
              border:none !important;
              box-shadow:none !important;
          }
          .gsc-control-cse{ padding:0 !important; }
          .gsc-control-wrapper-cse{ padding:0 !important; }
          .gsc-wrapper{ width:100% !important; max-width:700px !important; }

          /* === Hidden elements === */
          .gsc-above-wrapper-area,
          .gsc-adBlock, .gsc-adBlockNoHeight,
          .gcse-branding, .gcsc-branding, .gcsc-branding-clickable,
          .gcsc-find-more-on-google, .gcsc-find-more-on-google-root, .gcsc-more-maybe-branding-root,
          .gsc-clear-button, .gsc-search-box{
              display:none !important;
              opacity:0 !important;
              pointer-events:none !important;
          }
          .gs-spacer{ display:none !important; }
          .gs-richsnippet-box, .gs-per-result-labels{ display:none !important; }
          .gsc-webResult-divider{ display:none !important; }

          /* === Tabs === */
          .gsc-tabsArea{
              display:flex !important;
              align-items:center !important;
              flex-wrap:wrap !important;
              gap:0.75rem !important;
              background:transparent !important;
              border:none !important;
              margin-top:0 !important;
          }
          .gsc-tabHeader{
              background:rgba(24,24,27,0.58) !important;
              border:1px solid rgba(82,82,91,0.3) !important;
              border-radius:1.5rem !important;
              padding:0.55rem 1.1rem !important;
              margin:0 !important;
              color:rgb(212,212,216) !important;
              font-size:0.875rem !important;
              line-height:1.5 !important;
              cursor:pointer !important;
              backdrop-filter:blur(8px) !important;
              -webkit-backdrop-filter:blur(8px) !important;
              transition:all 0.3s !important;
              box-shadow:none !important;
          }
          .gsc-tabhActive{
              background:rgba(39,39,42,0.92) !important;
              color:white !important;
              border-color:rgba(113,113,122,0.45) !important;
          }
          .gsc-tabhInactive:hover{
              background:rgba(39,39,42,0.8) !important;
              color:white !important;
          }

          /* === Web results expansion area === */
          .gsc-webResult > .gsc-expansionArea,
          .gsc-results.gsc-webResult .gsc-expansionArea{
              background:transparent !important;
              border:none !important;
              display:flex !important;
              flex-direction:column !important;
              gap:0.75rem !important;
              padding-top:0.5rem !important;
          }

          /* === Web result card === */
          .gsc-webResult.gsc-result{
              background:rgba(24,24,27,0.58) !important;
              border:1px solid rgba(82,82,91,0.3) !important;
              border-radius:1.5rem !important;
              backdrop-filter:blur(12px) !important;
              -webkit-backdrop-filter:blur(12px) !important;
              padding:0.875rem 1.125rem !important;
              transition:all 0.3s !important;
              overflow:hidden !important;
              margin-bottom:0 !important;
          }
          .gsc-webResult.gsc-result:hover{
              background:rgba(39,39,42,0.82) !important;
              border-color:rgba(82,82,91,0.5) !important;
              transform:translateY(-1px) !important;
          }
          .gsc-table-result,
          .gsc-table-cell-snippet-close,
          .gsc-table-cell-thumbnail,
          .gsc-thumbnail-inside{
              background:transparent !important;
              border:none !important;
              padding:0 !important;
          }

          /* === Web result text === */
          .gs-title, .gs-title b, .gs-title a, .gs-title a b{
              color:rgb(244,244,245) !important;
              font-size:1rem !important;
              font-weight:600 !important;
              text-decoration:none !important;
              line-height:1.4 !important;
          }
          .gs-title a:hover, .gs-title a:hover b{
              color:rgb(228,228,231) !important;
              text-decoration:underline !important;
          }
          .gs-snippet, .gs-snippet b{
              color:rgb(161,161,170) !important;
              font-size:0.875rem !important;
              line-height:1.6 !important;
              margin-top:0.25rem !important;
          }
          .gs-snippet b{ color:rgb(212,212,216) !important; }
          .gs-visibleUrl, .gs-visibleUrl-short,
          .gs-visibleUrl-long, .gs-visibleUrl-breadcrumb,
          .gs-visibleUrl span{
              color:rgb(113,113,122) !important;
              font-size:0.75rem !important;
          }
          .gs-bidi-start-align{ border:none !important; }

          /* === Image results container === */
          .gsc-imageResult > .gsc-expansionArea{
              display:grid !important;
              grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)) !important;
              gap:0.75rem !important;
              padding:0.5rem 0 !important;
              flex-direction:unset !important;
              background:transparent !important;
              border:none !important;
          }

          /* === Image result card (not selected) === */
          .gsc-imageResult.gsc-result{
              background:rgba(24,24,27,0.58) !important;
              border:1px solid rgba(82,82,91,0.3) !important;
              border-radius:1.5rem !important;
              backdrop-filter:blur(12px) !important;
              -webkit-backdrop-filter:blur(12px) !important;
              padding:0 !important;
              margin:0 !important;
              overflow:hidden !important;
              transition:all 0.3s !important;
              aspect-ratio:1/1 !important;
              min-height:0 !important;
          }
          .gsc-imageResult.gsc-result:not(.gs-selectedImageResult):hover{
              background:rgba(39,39,42,0.82) !important;
              border-color:rgba(113,113,122,0.45) !important;
              transform:scale(1.02) !important;
          }
          .gsc-imageResult.gsc-result:not(.gs-selectedImageResult):active{
              transform:scale(0.97) !important;
          }

          /* === Image inner elements — fill card completely === */
          .gs-imageResult{
              overflow:hidden !important;
              padding:0 !important;
              margin:0 !important;
              width:100% !important;
              height:100% !important;
              display:flex !important;
              flex-direction:column !important;
          }
          .gs-image-thumbnail-box{
              width:100% !important;
              height:100% !important;
              overflow:hidden !important;
              display:block !important;
          }
          .gs-image-box{
              width:100% !important;
              height:100% !important;
              display:block !important;
          }
          a.gs-image{
              width:100% !important;
              height:100% !important;
              display:block !important;
          }
          img.gs-image{
              width:100% !important;
              height:100% !important;
              max-width:100% !important;
              max-height:100% !important;
              object-fit:cover !important;
              display:block !important;
              border-radius:0 !important;
              border:none !important;
          }

          /* === Selected image card — stays as thumbnail (preview via custom React modal) === */
          .gsc-imageResult.gsc-result.gs-selectedImageResult{
              aspect-ratio:1/1 !important;
              height:auto !important;
              overflow:hidden !important;
              border-radius:1.5rem !important;
              padding:0 !important;
              background:rgba(24,24,27,0.68) !important;
              border-color:rgba(113,113,122,0.5) !important;
              box-shadow:0 0 0 1px rgba(113,113,122,0.28), 0 12px 30px rgba(0,0,0,0.28) !important;
              order:unset !important;
              grid-column:unset !important;
          }
          .gs-selectedImageResult .gs-imageResult{
              overflow:hidden !important;
              padding:0 !important;
              display:flex !important;
              flex-direction:column !important;
              height:100% !important;
              width:100% !important;
          }
          .gs-selectedImageResult .gs-image-thumbnail-box{ display:block !important; }
          /* Hide ALL native GCS preview elements — custom modal is used instead */
          .gs-imagePreviewArea,
          .gs-image-popup-box,
          .gs-mobilePreview,
          .gs-previewVisit,
          .gs-previewTitle,
          .gs-previewDescription,
          .gs-previewSnippet{ display:none !important; opacity:0 !important; pointer-events:none !important; }



          /* === No results === */
          .gs-no-results-result > .gs-snippet{
              background:rgba(234,179,8,0.12) !important;
              color:rgb(254,249,195) !important;
              border:1px solid rgba(234,179,8,0.3) !important;
              border-radius:1.5rem !important;
              padding:1rem 1.25rem !important;
              backdrop-filter:blur(8px) !important;
          }

          /* === Misc text styles === */
          .gs-spelling{ color:rgb(192,132,252) !important; }
          .gs-spelling > a{ color:rgb(228,228,231) !important; }
          .gs-fileFormatType{ color:rgb(113,113,122) !important; }
          .gs-captcha-msg{ color:rgb(228,228,231) !important; }

          /* === Pagination === */
          .gsc-cursor-box{
              border:none !important;
              display:flex !important;
              justify-content:center !important;
              gap:0.375rem !important;
              padding:0.75rem 0 !important;
              margin-top:0.25rem !important;
          }
          .gsc-cursor-page{
              padding:0.4rem 0.85rem !important;
              background:rgba(24,24,27,0.58) !important;
              border:1px solid rgba(82,82,91,0.3) !important;
              color:rgb(161,161,170) !important;
              border-radius:1.5rem !important;
              font-size:0.875rem !important;
              cursor:pointer !important;
              transition:all 0.3s !important;
          }
          .gsc-cursor-page:hover{ background:rgba(39,39,42,0.82) !important; color:white !important; }
          .gsc-cursor-current-page{
              background:rgba(39,39,42,0.92) !important;
              border-color:rgba(113,113,122,0.45) !important;
              color:white !important;
          }
          .gsc-cursor-next-page{ color:rgb(212,212,216) !important; font-size:0.875rem !important; }
          .gsc-cursor-chevron{ fill:rgb(212,212,216) !important; }
          .gsc-cursor-container-next{
              display:flex !important;
              align-items:center !important;
              justify-content:flex-end !important;
          }
          .gsc-inline-block{
              border-radius:999px !important;
              backdrop-filter:blur(8px) !important;
              background:transparent !important;
          }
        ` }} />

        {/* Search Header Bar */}
        <div className="w-full flex flex-col items-center lg:flex-row gap-3 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[9999]">
          <motion.div
            initial={false}
            animate={{ opacity: queryParam ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => router.push('/')}
            className="cursor-pointer hover:opacity-90 active:scale-95 duration-300 shrink-0"
          >
            {/* Multi-gradient ancial text logo */}
            <Image alt="Ancial Logo" className="h-12" width={120} height={120} src="/img/logos/ancial-write.svg" />
          </motion.div>

          {queryParam && (
            <motion.div layoutId="search-bar" transition={{ type: "spring", stiffness: 600, damping: 50 }} className="flex flex-col gap-1 relative w-full max-w-screen-md z-[99999]">
              {searchBarContent}
            </motion.div>
          )}
        </div>

        {/* Results output */}
        <div className="w-full h-full shrink-0 flex flex-col">
          <div id="gcs-container" className="gcse-searchresults-only w-full"></div>
          <div className="lg:hidden"><br /><br /><br /></div>
        </div>

        {/* Custom Image Preview Modal */}
        {imageModal && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-2xl"
            onClick={() => setImageModal(null)}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl border border-zinc-600/30 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setImageModal(null)}
                className="absolute top-3 right-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-800/90 text-zinc-200 duration-300 active:scale-95 hover:bg-zinc-700"
                aria-label="Закрыть"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <use href="/icons.svg#IC-modal-close"></use>
                </svg>
              </button>

              {/* Image */}
              <div className="flex-shrink-0 flex items-start justify-center w-full md:w-auto">
                <img
                  src={imageModal.src}
                  alt={imageModal.title || 'Image preview'}
                  className="rounded-3xl object-contain"
                  style={{ maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto', minWidth: '180px' }}
                />
              </div>

              {/* Info */}
              <div className="flex flex-col gap-3 flex-1 min-w-0 pt-1 pr-8">
                {imageModal.title && (
                  <p className="text-zinc-100 font-semibold text-base leading-snug line-clamp-3">
                    {imageModal.title}
                  </p>
                )}
                {imageModal.pageUrl && (
                  <p className="text-zinc-500 text-xs truncate">
                    {(() => { try { return new URL(imageModal.pageUrl).hostname; } catch { return imageModal.pageUrl; } })()}
                  </p>
                )}
                <div className="flex flex-col gap-2 mt-2">
                  {imageModal.pageUrl && (
                    <a
                      href={imageModal.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-800 px-5 py-2 text-sm font-medium text-white duration-300 active:scale-95 hover:bg-zinc-700"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                        <use href="/icons.svg#IC-modal-external"></use>
                      </svg>
                      {lang?.open_page || 'Открыть страницу'}
                    </a>
                  )}
                  <a
                    href={imageModal.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-900/80 px-5 py-2 text-sm font-medium text-zinc-300 duration-300 active:scale-95 hover:bg-zinc-800"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                      <use href="/icons.svg#IC-modal-download"></use>
                    </svg>
                    {lang?.open_image || 'Открыть изображение'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
