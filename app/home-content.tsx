'use client';

import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Script from 'next/script';
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

  if (!cseControllerRef.current && typeof window !== 'undefined') {
    cseControllerRef.current = createGoogleCseSearchController({
      getElement: () => {
        const cse = (window as HomeWindow).google?.search?.cse?.element;
        return cse?.getElement('my-search-results') as GoogleCseElement | null;
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

  return (
    <div className="home-route relative isolate h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full flex flex-col items-center overflow-hidden overscroll-none duration-300">

      {/* 1. Landing page view (hidden when queryParam is set) */}
      <div className={`w-full h-full flex-col items-center justify-center p-3 md:p-0 gap-3 relative duration-300 ${queryParam ? 'hidden' : 'flex'}`}>
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
        <div className="bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-3xl w-full max-w-screen-md p-3 flex items-center gap-3 shadow relative z-10">
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
        </div>

        {/* Search Input Container */}
        <div className="flex flex-col gap-1 relative w-full max-w-screen-md z-20">
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
        </div>

        {/* Information Widgets below Search */}
        <div className="w-full max-w-screen-md flex items-center gap-3 opacity-80 z-10 px-3 md:px-0 text-sm">
          {/* Weather Widget */}
          <div
            onClick={() => router.push('/apps/overlay/weather')}
            className="flex items-center justify-center gap-1.5 cursor-pointer duration-300 active:scale-95 hover:bg-zinc-800/70 hover:px-2 py-0.5 rounded-full border border-transparent hover:border-zinc-600/30 transition-all"
          >
            {weatherLoading ? (
              <svg className="w-5 h-5 inline animate-spin fill-zinc-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
              </svg>
            ) : weather && weather.wfont ? (
              <span
                className="flex items-center justify-center w-5 h-5 shrink-0 animate-fade-in"
                dangerouslySetInnerHTML={{ __html: weather.wfont }}
              />
            ) : (
              <svg className="w-5 h-5 fill-white inline animate-fade-in" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path d="M 24 8 C 16.522892 8 10.415747 13.720449 9.6523438 21 L 9 21 C 4.0472805 21 0 25.047281 0 30 C 0 34.952719 4.0472805 39 9 39 L 39 39 C 43.952719 39 48 34.952719 48 30 C 48 25.047281 43.952719 21 39 21 L 38.347656 21 C 37.584253 13.720449 31.477108 8 24 8 z"></path>
              </svg>
            )}
            <span className="text-white font-medium">
              {weatherLoading ? '...' : (weather?.temp !== null && weather?.temp !== undefined ? `${weather.temp}°C` : 'Погода')}
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
                <span className="text-zinc-300 font-medium">{currencies.usd || '...'}</span>
              </div>

              {/* EUR Widget */}
              <div className="flex items-center justify-center gap-1">
                <svg className="w-4 h-4 fill-zinc-400 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <use href="/icons.svg#IC-euro"></use>
                </svg>
                <span className="text-zinc-300 font-medium">{currencies.eur || '...'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Search Results View (persists in DOM, only hidden when q is empty) */}
      <div className={`w-full h-screen overflow-y-auto flex-col items-center lg:items-start p-3 pt-0 gap-3 relative ${queryParam ? 'flex' : 'hidden'}`}>
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
          <div
            onClick={() => router.push('/')}
            className="cursor-pointer hover:opacity-90 active:scale-95 duration-300 shrink-0"
          >
            {/* Multi-gradient ancial text logo */}
            <svg className="h-7" viewBox="0 0 476 97" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M95.875 56.625C95.8333 57.4583 95.8125 58.3125 95.8125 59.1875C95.8125 60.8125 95.8958 62.6875 96.0625 64.8125C96.2708 66.9375 96.6458 69.1458 97.1875 71.4375C97.7292 73.6875 98.3958 75.6458 99.1875 77.3125C99.9792 78.9375 100.875 80.0208 101.875 80.5625L93.8125 95.625C92.1875 94.875 90.7292 93.9167 89.4375 92.75C88.1875 91.5417 87.0625 90.1875 86.0625 88.6875C85.0625 87.1875 84.1875 85.5833 83.4375 83.875C82.7292 82.1667 82.1042 80.4167 81.5625 78.625C79.1875 81.1667 76.5417 83.5 73.625 85.625C70.7083 87.75 67.5417 89.6042 64.125 91.1875C60.75 92.7292 57.1458 93.9375 53.3125 94.8125C49.5208 95.7292 45.5417 96.25 41.375 96.375C40.8333 96.375 40.3125 96.375 39.8125 96.375C36.3125 96.375 32.8542 95.9792 29.4375 95.1875C26.0208 94.4375 22.7708 93.3125 19.6875 91.8125C16.6458 90.2708 13.8958 88.4792 11.4375 86.4375C9.02083 84.3542 6.95833 82.125 5.25 79.75C3.54167 77.375 2.22917 74.9167 1.3125 72.375C0.4375 69.7917 0 67.2708 0 64.8125C0 60.7292 0.666667 57.2708 2 54.4375C3.375 51.5625 5.125 49.1667 7.25 47.25C9.41667 45.2917 11.8333 43.7292 14.5 42.5625C17.2083 41.3958 19.8958 40.5 22.5625 39.875C25.2708 39.25 27.8125 38.8125 30.1875 38.5625C32.6042 38.3125 34.6042 38.125 36.1875 38L37.0625 37.9375C39.6042 37.7292 42.5208 37.5625 45.8125 37.4375C49.1458 37.2708 52.6458 37.1667 56.3125 37.125C59.9792 37.0417 63.7083 37 67.5 37C71.3333 37 75.0208 37.0208 78.5625 37.0625C78.5625 34.6875 77.75 32.2292 76.125 29.6875C74.5 27.1042 72.2708 24.75 69.4375 22.625C66.6042 20.4583 63.2292 18.6875 59.3125 17.3125C55.4375 15.8958 51.25 15.1875 46.75 15.1875C44.25 15.1875 41.6667 15.4375 39 15.9375C36.375 16.4375 33.6875 17.25 30.9375 18.375C28.2292 19.5 25.4792 20.9583 22.6875 22.75C19.8958 24.5 17.125 26.6458 14.375 29.1875L3.375 19.25C6.375 15.875 9.66667 12.9792 13.25 10.5625C16.875 8.14583 20.5833 6.16667 24.375 4.625C28.2083 3.08333 32.0208 1.95833 35.8125 1.25C39.6458 0.5 43.2917 0.125 46.75 0.125C52.9167 0.125 58.4167 0.770833 63.25 2.0625C68.0833 3.35417 72.3125 5.0625 75.9375 7.1875C79.6042 9.27083 82.6875 11.6458 85.1875 14.3125C87.7292 16.9792 89.7917 19.6875 91.375 22.4375C92.9583 25.1875 94.1042 27.8542 94.8125 30.4375C95.5208 33.0208 95.875 35.2917 95.875 37.25C95.875 37.2917 95.8333 37.3125 95.75 37.3125C95.7083 37.3125 95.6875 37.3333 95.6875 37.375H95.875V56.625ZM20.75 73.375C23.7917 76.125 27.1458 78.1458 30.8125 79.4375C34.4792 80.7292 38.2708 81.375 42.1875 81.375C46.4375 81.375 50.6458 80.6667 54.8125 79.25C58.9792 77.8333 62.7917 75.8333 66.25 73.25C69.75 70.625 72.7292 67.5 75.1875 63.875C77.6458 60.2083 79.2708 56.125 80.0625 51.625C76.5208 51.5833 72.8125 51.5625 68.9375 51.5625C65.1042 51.5625 61.3333 51.6042 57.625 51.6875C53.9167 51.7292 50.3958 51.8125 47.0625 51.9375C43.7292 52.0625 40.8125 52.2292 38.3125 52.4375L37.375 52.5C33.1667 52.875 29.7083 53.3542 27 53.9375C24.2917 54.5208 22.1458 55.2917 20.5625 56.25C18.9792 57.2083 17.875 58.3958 17.25 59.8125C16.625 61.1875 16.3125 62.8542 16.3125 64.8125C16.3125 66.3958 16.7083 67.8958 17.5 69.3125C18.3333 70.6875 19.4167 72.0417 20.75 73.375Z" fill="url(#paint0_radial_2042_20)" />
              <path d="M108.312 39C108.354 38.2083 108.375 37.3958 108.375 36.5625C108.375 34.8958 108.271 33 108.062 30.875C107.854 28.7083 107.479 26.5 106.938 24.25C106.438 21.9583 105.792 20 105 18.375C104.208 16.7083 103.312 15.6042 102.312 15.0625L110.125 0C111.958 0.958333 113.729 2.375 115.438 4.25C117.146 6.08333 118.646 8.22917 119.938 10.6875C121.271 13.1042 122.312 15.7708 123.062 18.6875C123.854 21.5625 124.25 24.5417 124.25 27.625C124.875 26.9167 125.75 25.8958 126.875 24.5625C128 23.1875 129.354 21.6667 130.938 20C132.521 18.2917 134.292 16.5 136.25 14.625C138.25 12.75 140.438 10.9583 142.812 9.25C145.188 7.54167 147.729 6 150.438 4.625C153.188 3.25 156.062 2.1875 159.062 1.4375C160.271 1.14583 161.708 0.895833 163.375 0.6875C165.083 0.4375 166.896 0.3125 168.812 0.3125C170.771 0.3125 172.812 0.458333 174.938 0.75C177.062 1.04167 179.167 1.58333 181.25 2.375C183.333 3.125 185.354 4.14583 187.312 5.4375C189.271 6.6875 191.062 8.29167 192.688 10.25C194.312 12.2083 195.729 14.5417 196.938 17.25C198.146 19.9167 199.021 23.0625 199.562 26.6875C200.021 29.6875 200.354 32.625 200.562 35.5C200.812 38.3333 200.979 40.875 200.562 43.125C201.146 45.0833 201.188 46.9792 201.188 48.8125V94H184.25V43C184.25 38.0833 183.833 33.9583 183 30.625C182.208 27.25 181.104 24.5417 179.688 22.5C178.312 20.4167 176.667 18.9375 174.75 18.0625C172.875 17.1458 170.854 16.6875 168.688 16.6875C165.979 16.6875 163.208 17.2292 160.375 18.3125C157.583 19.3542 154.792 20.7708 152 22.5625C149.25 24.3542 146.562 26.4167 143.938 28.75C141.312 31.0417 138.833 33.4375 136.5 35.9375C134.208 38.4375 132.104 40.9583 130.188 43.5C128.271 46 126.625 48.3333 125.25 50.5V94.0625H108.312V39Z" fill="url(#paint1_radial_2042_20)" />
              <path d="M273.188 94.3125C267.354 94.3125 261.708 93.9167 256.25 93.125C250.792 92.3333 245.667 91.1458 240.875 89.5625C236.083 87.9375 231.708 85.8958 227.75 83.4375C223.792 80.9792 220.375 78.0625 217.5 74.6875C214.667 71.2708 212.458 67.375 210.875 63C209.292 58.625 208.5 53.75 208.5 48.375C208.5 43.25 209.292 38.5625 210.875 34.3125C212.458 30.0625 214.667 26.2292 217.5 22.8125C220.375 19.3958 223.792 16.4167 227.75 13.875C231.708 11.2917 236.083 9.14583 240.875 7.4375C245.667 5.72917 250.792 4.45833 256.25 3.625C261.708 2.75 267.354 2.3125 273.188 2.3125L273.125 17.6875C265.333 17.7292 258.438 18.6458 252.438 20.4375C246.479 22.1875 241.479 24.5 237.438 27.375C233.396 30.2083 230.312 33.4583 228.188 37.125C226.104 40.75 225.021 44.4792 224.938 48.3125C224.938 48.4792 224.938 48.6458 224.938 48.8125C224.938 52.4792 225.896 56.1042 227.812 59.6875C229.729 63.2708 232.688 66.5 236.688 69.375C240.729 72.25 245.771 74.5833 251.812 76.375C257.896 78.1667 265 79.0833 273.125 79.125L273.188 94.3125Z" fill="url(#paint2_radial_2042_20)" />
              <path d="M280.438 19.625V2.4375H297V19.625H280.438ZM297 26.125V94.0625H280.438V26.125H297Z" fill="url(#paint3_radial_2042_20)" />
              <path d="M400.75 56.625C400.708 57.4583 400.688 58.3125 400.688 59.1875C400.688 60.8125 400.771 62.6875 400.938 64.8125C401.146 66.9375 401.521 69.1458 402.062 71.4375C402.604 73.6875 403.271 75.6458 404.062 77.3125C404.854 78.9375 405.75 80.0208 406.75 80.5625L398.688 95.625C397.062 94.875 395.604 93.9167 394.312 92.75C393.062 91.5417 391.938 90.1875 390.938 88.6875C389.938 87.1875 389.062 85.5833 388.312 83.875C387.604 82.1667 386.979 80.4167 386.438 78.625C384.062 81.1667 381.417 83.5 378.5 85.625C375.583 87.75 372.417 89.6042 369 91.1875C365.625 92.7292 362.021 93.9375 358.188 94.8125C354.396 95.7292 350.417 96.25 346.25 96.375C345.708 96.375 345.188 96.375 344.688 96.375C341.188 96.375 337.729 95.9792 334.312 95.1875C330.896 94.4375 327.646 93.3125 324.562 91.8125C321.521 90.2708 318.771 88.4792 316.312 86.4375C313.896 84.3542 311.833 82.125 310.125 79.75C308.417 77.375 307.104 74.9167 306.188 72.375C305.312 69.7917 304.875 67.2708 304.875 64.8125C304.875 60.7292 305.542 57.2708 306.875 54.4375C308.25 51.5625 310 49.1667 312.125 47.25C314.292 45.2917 316.708 43.7292 319.375 42.5625C322.083 41.3958 324.771 40.5 327.438 39.875C330.146 39.25 332.688 38.8125 335.062 38.5625C337.479 38.3125 339.479 38.125 341.062 38L341.938 37.9375C344.479 37.7292 347.396 37.5625 350.688 37.4375C354.021 37.2708 357.521 37.1667 361.188 37.125C364.854 37.0417 368.583 37 372.375 37C376.208 37 379.896 37.0208 383.438 37.0625C383.438 34.6875 382.625 32.2292 381 29.6875C379.375 27.1042 377.146 24.75 374.312 22.625C371.479 20.4583 368.104 18.6875 364.188 17.3125C360.312 15.8958 356.125 15.1875 351.625 15.1875C349.125 15.1875 346.542 15.4375 343.875 15.9375C341.25 16.4375 338.562 17.25 335.812 18.375C333.104 19.5 330.354 20.9583 327.562 22.75C324.771 24.5 322 26.6458 319.25 29.1875L308.25 19.25C311.25 15.875 314.542 12.9792 318.125 10.5625C321.75 8.14583 325.458 6.16667 329.25 4.625C333.083 3.08333 336.896 1.95833 340.688 1.25C344.521 0.5 348.167 0.125 351.625 0.125C357.792 0.125 363.292 0.770833 368.125 2.0625C372.958 3.35417 377.188 5.0625 380.812 7.1875C384.479 9.27083 387.562 11.6458 390.062 14.3125C392.604 16.9792 394.667 19.6875 396.25 22.4375C397.833 25.1875 398.979 27.8542 399.688 30.4375C400.396 33.0208 400.75 35.2917 400.75 37.25C400.75 37.2917 400.708 37.3125 400.625 37.3125C400.583 37.3125 400.562 37.3333 400.562 37.375H400.75V56.625ZM325.625 73.375C328.667 76.125 332.021 78.1458 335.688 79.4375C339.354 80.7292 343.146 81.375 347.062 81.375C351.312 81.375 355.521 80.6667 359.688 79.25C363.854 77.8333 367.667 75.8333 371.125 73.25C374.625 70.625 377.604 67.5 380.062 63.875C382.521 60.2083 384.146 56.125 384.938 51.625C381.396 51.5833 377.688 51.5625 373.812 51.5625C369.979 51.5625 366.208 51.6042 362.5 51.6875C358.792 51.7292 355.271 51.8125 351.938 51.9375C348.604 52.0625 345.688 52.2292 343.188 52.4375L342.25 52.5C338.042 52.875 334.583 53.3542 331.875 53.9375C329.167 54.5208 327.021 55.2917 325.438 56.25C323.854 57.2083 322.75 58.3958 322.125 59.8125C321.5 61.1875 321.188 62.8542 321.188 64.8125C321.188 66.3958 321.583 67.8958 322.375 69.3125C323.208 70.6875 324.292 72.0417 325.625 73.375Z" fill="url(#paint4_radial_2042_20)" />
              <path d="M475.312 79.625V94.0625H415.562L409 79.6875L443.938 2.4375H462.438L427.5 79.6875C435.542 79.6875 442.896 79.6667 449.562 79.625H475.312Z" fill="url(#paint5_radial_2042_20)" />
              <defs>
                <radialGradient id="paint0_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
                <radialGradient id="paint1_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
                <radialGradient id="paint2_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
                <radialGradient id="paint3_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
                <radialGradient id="paint4_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
                <radialGradient id="paint5_radial_2042_20" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(237.625 60.5625) scale(240.5 69.5)">
                  <stop stopColor="#F700FF" />
                  <stop offset="1" stopColor="#6A06FF" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          <div className="flex flex-col gap-1 relative w-full max-w-screen-md">
            <form onSubmit={handleSearchSubmit} className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 relative z-[11]">
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
          </div>
        </div>

        {/* Results output */}
        <div className="w-full h-full shrink-0 flex flex-col">
          <div className="gcse-searchresults-only" data-gname="my-search-results"></div>
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
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
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
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
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
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
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
