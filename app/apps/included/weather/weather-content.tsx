'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { cache } from '../../../lib/cache';
import { safeFetchJson } from '../../../lib/safe-fetch-json';
import {
  buildWeatherMapLinks,
  buildWeatherMedia,
  detectWeatherKey,
  getDayOfMonthAfter,
  getForecastIconKey,
  isDayTime,
  type WeatherAppData,
  type WeatherForecastIconKey,
} from './weather-model';

type WeatherApiResponse = {
  success: boolean;
  data: WeatherAppData | null;
  error: string | null;
};

function SpinnerIcon() {
  return (
    <svg className="inline h-24 w-24 animate-spin fill-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M24 4a1.5 1.5 0 1 0 0 3c6.256 0 11.766 3.407 14.703 8.455a1.5 1.5 0 1 0 2.594-1.51C37.834 7.994 31.344 4 24 4Z" />
    </svg>
  );
}

function WeatherSkeleton() {
  return (
    <div className="flex flex-col items-center w-full animate-pulse">
      {/* Big Temperature Skeleton - aligned to left matching real font size */}
      <div className="-mb-14 -mt-10 flex w-full items-start gap-1">
        <div className="h-44 w-52 rounded-3xl bg-white/15 backdrop-blur-md" />
        <div className="h-12 w-8 rounded-2xl bg-white/15 mt-6" />
      </div>

      {/* Mornight & Weather status text skeleton - left aligned */}
      <div className="mt-6 flex w-full flex-col items-start gap-2">
        <div className="h-7 w-44 rounded-full bg-white/15 backdrop-blur-md" />
        <div className="h-8 w-36 rounded-full bg-white/15 backdrop-blur-md" />
      </div>

      {/* Hourly forecast skeleton */}
      <div className="mt-4 flex w-full flex-col rounded-3xl border border-zinc-600/30 bg-black/10 p-3 shadow backdrop-blur-md">
        <div className="h-5 w-36 rounded-full bg-white/15 mb-3" />
        <div className="flex w-full justify-between gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-14 shrink-0 flex-col items-center gap-2">
              <div className="h-4 w-10 rounded bg-white/15" />
              <div className="h-8 w-8 rounded-full bg-white/15" />
              <div className="h-5 w-8 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming days skeleton */}
      <div className="mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 bg-black/10 p-3 shadow backdrop-blur-md">
        <div className="h-5 w-32 rounded-full bg-white/15 mb-3" />
        <div className="flex w-full justify-between gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-14 shrink-0 flex-col items-center gap-2">
              <div className="h-4 w-10 rounded bg-white/15" />
              <div className="h-8 w-8 rounded-full bg-white/15" />
              <div className="h-5 w-8 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>

      {/* Atmospheric details skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col justify-between h-20 rounded-3xl border border-zinc-600/30 bg-black/10 p-3.5 shadow backdrop-blur-md">
            <div className="h-3 w-16 rounded bg-white/15" />
            <div className="h-6 w-20 rounded bg-white/15 mt-2" />
          </div>
        ))}
      </div>

      {/* Sun & Moon cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-3 mb-8">
        <div className="h-32 rounded-3xl border border-zinc-600/30 bg-black/10 p-4 shadow backdrop-blur-md flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 rounded bg-white/15" />
            <div className="h-5 w-28 rounded-full bg-white/15" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-10 rounded-xl bg-white/15" />
            <div className="h-10 rounded-xl bg-white/15" />
          </div>
        </div>
        <div className="h-32 rounded-3xl border border-zinc-600/30 bg-black/10 p-4 shadow backdrop-blur-md flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 w-24 rounded bg-white/15" />
            <div className="h-5 w-14 rounded-full bg-white/15" />
          </div>
          <div className="h-10 rounded-xl bg-white/15 mt-4" />
        </div>
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg className="inline h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M24 4C14.629 4 7 11.629 7 21c0 4.207 1.543 8.065 4.078 11.031l.008.008.006.008s7.232 8.252 9.807 10.709c1.724 1.644 4.477 1.644 6.201 0 2.934-2.799 9.811-10.713 9.811-10.713l.004-.006.006-.006C39.457 29.065 41 25.207 41 21 41 11.629 33.371 4 24 4Zm0 3c7.749 0 14 6.251 14 14 0 3.475-1.266 6.633-3.361 9.082-.014.016-7.049 8.061-9.61 10.504-.594.566-1.466.566-2.06 0-2.14-2.042-9.588-10.479-9.609-10.504l-.002-.002C11.265 27.631 10 24.474 10 21 10 13.251 16.251 7 24 7Zm0 8c-1.875 0-3.471.757-4.496 1.91C18.479 18.063 18 19.542 18 21s.479 2.937 1.504 4.09C20.529 26.243 22.125 27 24 27s3.471-.757 4.496-1.91C29.521 23.937 30 22.458 30 21s-.479-2.937-1.504-4.09C27.471 15.757 25.875 15 24 15Zm0 3c1.125 0 1.779.368 2.254.902.475.535.746 1.306.746 2.098s-.271 1.563-.746 2.098c-.475.534-1.129.902-2.254.902s-1.779-.368-2.254-.902C21.271 22.563 21 21.792 21 21s.271-1.563.746-2.098C22.221 18.368 22.875 18 24 18Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="inline h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M20.5 6C12.51 6 6 12.51 6 20.5S12.51 35 20.5 35c3.456 0 6.634-1.221 9.129-3.25l9.81 9.811a1.5 1.5 0 1 0 2.122-2.121l-9.811-9.811C33.779 27.134 35 23.956 35 20.5 35 12.51 28.49 6 20.5 6Zm0 3C26.869 9 32 14.131 32 20.5c0 3.103-1.224 5.906-3.209 7.971a1.5 1.5 0 0 0-.32.32C26.406 30.776 23.603 32 20.5 32 14.131 32 9 26.869 9 20.5 9 14.131 14.131 9 20.5 9Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="inline h-24 w-24 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M24 3C12.402 3 3 12.402 3 24s9.402 21 21 21 21-9.402 21-21S35.598 3 24 3Zm8.121 13.758a1.5 1.5 0 0 1 .121 2.121L27.121 24l5.121 5.121a1.5 1.5 0 1 1-2.121 2.121L25 26.121l-5.121 5.121a1.5 1.5 0 0 1-2.121-2.121L22.879 24l-5.121-5.121a1.5 1.5 0 1 1 2.121-2.121L25 21.879l5.121-5.121a1.5 1.5 0 0 1 2 0Z" />
    </svg>
  );
}

function ForecastIcon({ iconKey }: { iconKey: WeatherForecastIconKey }) {
  if (iconKey === 'cloud') {
    return (
      <svg className="h-10 w-10 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path d="M24 8c-7.477 0-13.584 5.72-14.348 13H9c-4.953 0-9 4.047-9 9s4.047 9 9 9h30c4.953 0 9-4.047 9-9s-4.047-9-9-9h-.652C37.584 13.72 31.477 8 24 8Zm0 3c6.369 0 11.5 5.131 11.5 11.5A1.5 1.5 0 0 0 37 24h2c3.331 0 6 2.669 6 6s-2.669 6-6 6H9c-3.331 0-6-2.669-6-6s2.669-6 6-6h2A1.5 1.5 0 0 0 12.5 22.5C12.5 16.131 17.631 11 24 11Z" />
      </svg>
    );
  }

  if (iconKey === 'snow') {
    return (
      <svg className="h-10 w-10 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path d="M23.977 2.979A1.5 1.5 0 0 0 22.5 4.5v2.586l-1.129-.807a1.5 1.5 0 1 0-1.742 2.442l2.871 2.05V15h-2.83a1.5 1.5 0 0 0-1.299.75l-1.414 2.451-3.662-2.115-.342-3.512a1.5 1.5 0 0 0-2.984.289l.133 1.381-2.239-1.293a1.5 1.5 0 1 0-1.5 2.598l2.239 1.293-1.262.574a1.5 1.5 0 1 0 1.242 2.73l3.213-1.461 3.662 2.113-1.416 2.451a1.5 1.5 0 0 0 0 1.5l1.416 2.451-3.662 2.113-3.213-1.461a1.5 1.5 0 1 0-1.242 2.73l1.262.574-2.239 1.293a1.5 1.5 0 1 0 1.5 2.598l2.239-1.293-.133 1.381a1.5 1.5 0 1 0 2.984.289l.342-3.512 3.662-2.115 1.414 2.451a1.5 1.5 0 0 0 1.299.75h2.83v4.229l-2.871 2.05a1.5 1.5 0 1 0 1.742 2.442l1.129-.807V43.5a1.5 1.5 0 1 0 3 0v-2.586l1.129.807a1.5 1.5 0 1 0 1.742-2.442l-2.871-2.05V33h2.83a1.5 1.5 0 0 0 1.299-.75l1.414-2.451 3.662 2.115.342 3.512a1.5 1.5 0 1 0 2.984-.289l-.133-1.381 2.239 1.293a1.5 1.5 0 1 0 1.5-2.598l-2.239-1.293 1.262-.574a1.5 1.5 0 1 0-1.242-2.73l-3.213 1.461-3.662-2.113 1.416-2.451a1.5 1.5 0 0 0 0-1.5l-1.416-2.451 3.662-2.113 3.213 1.461a1.5 1.5 0 1 0 1.242-2.73l-1.262-.574 2.239-1.293a1.5 1.5 0 1 0-1.5-2.598l-2.239 1.293.133-1.381a1.5 1.5 0 1 0-2.984-.289l-.342 3.512-3.662 2.115-1.414-2.451A1.5 1.5 0 0 0 28.33 15H25.5v-4.229l2.871-2.05a1.5 1.5 0 1 0-1.742-2.442l-1.129.807V4.5a1.5 1.5 0 0 0-1.523-1.521ZM20.535 18h6.93l1.578 2.734L30.928 24l-1.606 2.783L27.465 30h-6.93l-1.609-2.789L17.072 24l1.578-2.732L20.535 18Z" />
      </svg>
    );
  }

  if (iconKey === 'rain') {
    return (
      <svg className="h-10 w-10 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path d="M24 6c-6.255 0-11.261 4.88-11.797 11H11.5C6.823 17 3 20.823 3 25.5S6.823 34 11.5 34h25C41.177 34 45 30.177 45 25.5S41.177 17 36.5 17h-.703C35.261 10.88 30.255 6 24 6Zm0 3c4.988 0 9 4.012 9 9v.5A1.5 1.5 0 0 0 34.5 20h2c3.055 0 5.5 2.445 5.5 5.5S39.555 31 36.5 31h-25C8.445 31 6 28.555 6 25.5S8.445 20 11.5 20h2A1.5 1.5 0 0 0 15 18.5V18c0-4.988 4.012-9 9-9Zm-12.023 26.979A1.5 1.5 0 0 0 10.5 37.5v2a1.5 1.5 0 1 0 3 0v-2a1.5 1.5 0 0 0-1.523-1.521Zm12 0A1.5 1.5 0 0 0 22.5 37.5v2a1.5 1.5 0 1 0 3 0v-2a1.5 1.5 0 0 0-1.523-1.521Zm12 0A1.5 1.5 0 0 0 34.5 37.5v2a1.5 1.5 0 1 0 3 0v-2a1.5 1.5 0 0 0-1.523-1.521ZM17.977 38.979A1.5 1.5 0 0 0 16.5 40.5v2a1.5 1.5 0 1 0 3 0v-2a1.5 1.5 0 0 0-1.523-1.521Zm12 0A1.5 1.5 0 0 0 28.5 40.5v2a1.5 1.5 0 1 0 3 0v-2a1.5 1.5 0 0 0-1.523-1.521Z" />
      </svg>
    );
  }

  return (
    <svg className="h-10 w-10 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M23.977 3.979A1.5 1.5 0 0 0 22.5 5.5v3a1.5 1.5 0 1 0 3 0v-3a1.5 1.5 0 0 0-1.523-1.521ZM10.902 9.404a1.5 1.5 0 0 0-1.045 2.576l2.121 2.121a1.501 1.501 0 0 0 2.123-2.123l-2.121-2.121a1.5 1.5 0 0 0-1.078-.453Zm26.148 0a1.5 1.5 0 0 0-1.031.453l-2.121 2.121a1.501 1.501 0 0 0 2.123 2.123l2.121-2.121A1.5 1.5 0 0 0 37.05 9.404ZM24 13c-6.057 0-11 4.943-11 11s4.943 11 11 11 11-4.943 11-11-4.943-11-11-11Zm0 3c4.436 0 8 3.564 8 8s-3.564 8-8 8-8-3.564-8-8 3.564-8 8-8ZM5.5 22.5a1.5 1.5 0 1 0 0 3h3a1.5 1.5 0 1 0 0-3Zm34 0a1.5 1.5 0 1 0 0 3h3a1.5 1.5 0 1 0 0-3ZM13.01 33.445a1.5 1.5 0 0 0-1.032.453l-2.121 2.121a1.501 1.501 0 1 0 2.123 2.123l2.121-2.121a1.5 1.5 0 0 0-1.091-2.576Zm21.933 0a1.5 1.5 0 0 0-1.045 2.576l2.121 2.121a1.501 1.501 0 1 0 2.123-2.123l-2.121-2.121a1.5 1.5 0 0 0-1.078-.453Zm-10.966 4.533A1.5 1.5 0 0 0 22.5 39.5v3a1.5 1.5 0 1 0 3 0v-3a1.5 1.5 0 0 0-1.523-1.521Z" />
    </svg>
  );
}

const QUICK_CITIES = [
  { name: 'Москва', label: 'Москва' },
  { name: 'Санкт-Петербург', label: 'СПб' },
  { name: 'Екатеринбург', label: 'Екатеринбург' },
  { name: 'Казань', label: 'Казань' },
  { name: 'Сочи', label: 'Сочи' },
  { name: 'Новосибирск', label: 'Новосибирск' },
];

type WeatherContentProps = {
  initialCity?: string;
};

export default function WeatherContent({ initialCity = '' }: WeatherContentProps) {
  const { lang, langCode } = useAuth();
  const [isNavigating, startTransition] = useTransition();

  const [searchCity, setSearchCity] = useState(initialCity.trim());
  const locale = langCode === 'en' ? 'en' : 'ru';
  const [weatherData, setWeatherData] = useState<WeatherAppData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedRequestKey, setCompletedRequestKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!searchCity && !geoCoords && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          // Ignores error, falls back to IP geolocation on backend
        },
        { timeout: 5000 }
      );
    }
  }, [searchCity, geoCoords]);

  const isLocationActive = !searchCity || Boolean(geoCoords);

  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [searchCity, weatherData?.city, geoCoords]);

  const requestKey = `${locale}:${searchCity}:${geoCoords?.lat}:${geoCoords?.lon}:${reloadKey}`;

  useEffect(() => {
    let isActive = true;

    async function run() {
      let endpoint = `/api/V2/info/WeatherApp.php?language=${locale}`;
      if (searchCity) {
        endpoint += `&city=${encodeURIComponent(searchCity)}`;
      } else if (geoCoords) {
        endpoint += `&lat=${geoCoords.lat}&lon=${geoCoords.lon}`;
      }

      const weatherCacheKey = `weather_${locale}_${searchCity.trim().toLowerCase() || (geoCoords ? `${geoCoords.lat.toFixed(2)}_${geoCoords.lon.toFixed(2)}` : 'default')}`;

      // 1. Instant Cache Hit (Stale-While-Revalidate)
      const cached = cache.get<WeatherAppData>(weatherCacheKey, {
        category: 'apps',
        subcategory: 'home',
      });

      if (cached && isActive) {
        setWeatherData(cached);
        setErrorMessage(null);
      }

      // 2. Background Revalidation
      const response = await safeFetchJson<WeatherApiResponse>(endpoint, {
        cache: 'no-store',
        credentials: 'include',
      });

      if (!isActive) {
        return;
      }

      if (!response?.success || !response.data) {
        if (!cached) {
          setWeatherData(null);
          setErrorMessage(response?.error || 'Unable to fetch weather data');
        }
        setCompletedRequestKey(requestKey);
        return;
      }

      const freshData: WeatherAppData = {
        ...response.data,
        weatherKey: response.data.weatherKey || detectWeatherKey(response.data.weather),
        days: Array.isArray(response.data.days) ? response.data.days : [],
      };

      setWeatherData(freshData);
      setErrorMessage(null);
      setCompletedRequestKey(requestKey);

      // Save to localStorage cache (TTL: 30 minutes)
      cache.set(weatherCacheKey, freshData, {
        category: 'apps',
        subcategory: 'home',
        ttl: 30 * 60 * 1000,
      });
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [locale, searchCity, geoCoords, requestKey]);

  const isLoading = completedRequestKey !== requestKey;

  const mode = isDayTime() ? 'day' : 'night';
  const media = useMemo(
    () => buildWeatherMedia(mode, weatherData?.weatherKey || 'default'),
    [mode, weatherData?.weatherKey],
  );

  const mapLinks = useMemo(() => {
    if (!weatherData) {
      return null;
    }

    return buildWeatherMapLinks(
      weatherData.coordinates.lat,
      weatherData.coordinates.lon,
      mode === 'day',
      locale,
    );
  }, [locale, mode, weatherData]);

  const forecastEntries = Array.from({ length: 6 }, (_, index) => {
    const offset = index + 1;
    const day = weatherData?.days[offset];
    const iconKey = getForecastIconKey(day?.weatherKey || 'default');
    const label = offset === 1 ? lang?.tomorrow || 'Tomorrow' : String(getDayOfMonthAfter(offset));

    return {
      iconKey,
      label,
      temp: day?.temp ?? null,
    };
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextCity = String(formData.get('city') || '').trim();
    startTransition(() => {
      setGeoCoords(null);
      setSearchCity(nextCity);
    });
  };

  const handleResetLocation = () => {
    startTransition(() => {
      setSearchCity('');
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGeoCoords({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          () => {
            setGeoCoords(null);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        setGeoCoords(null);
      }
    });
  };

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  const showLoadingOverlay = isLoading || isNavigating;

  return (
    <div className="apps-overlay-route no-mobile-nav-padding no-pc-nav-padding min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-black relative isolate">
      <style jsx global>{`
        @font-face {
          font-family: 'NauryzRedKedsWeather';
          src: url('/fonts/NauryzRedKeds.ttf');
        }

        .weather-cutetext {
          font-family: 'NauryzRedKedsWeather', sans-serif;
          font-style: normal;
          font-weight: 700;
          line-height: 100%;
          margin-top: 0.75rem;
        }
      `}</style>

      <div
        className="relative flex min-h-[100dvh] h-[100dvh] w-full items-center justify-center bg-center bg-cover overflow-hidden"
        style={
          media.backgroundImageUrl
            ? {
              backgroundImage: `url(${media.backgroundImageUrl})`,
            }
            : undefined
        }
      >
        {media.videoUrl && (
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            src={media.videoUrl}
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover pointer-events-none z-[-1]"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              minWidth: '100vw',
              minHeight: '100dvh',
              width: 'auto',
              height: 'auto',
              transform: 'translate(-50%, -50%)',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        )}

        <div className="absolute inset-0 hidden bg-gradient-to-r from-black via-black/10 to-transparent md:flex" />
        <div className="absolute inset-0 hidden bg-gradient-to-l from-black via-black/10 to-transparent md:flex" />
        <div className="absolute inset-0 bg-black/50" />

        {!showLoadingOverlay && errorMessage && (
          <div className="absolute inset-0 z-[999] overflow-hidden">
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-zinc-900/80 p-3 text-center backdrop-blur-sm">
              <CloseIcon />
              <span className="text-3xl text-zinc-300">{lang?.weather_error_happend || 'An error occurred'}</span>
              <span className="text-xl text-zinc-400">{lang?.weather_try_again || 'Try again later'}</span>
              {searchCity ? (
                <div className="w-fit rounded-3xl border border-zinc-600/30 bg-amber-500/25 p-3 text-center text-amber-400">
                  {lang?.error_weather || 'Unable to fetch weather data for'} &quot;{searchCity}&quot;.
                </div>
              ) : null}
              <button
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center rounded-full bg-zinc-800/80 px-3 py-2 text-white transition-colors duration-300 hover:bg-zinc-700/60 active:scale-95"
                onClick={handleRetry}
                type="button"
              >
                {lang?.try_again || 'Try again'}
              </button>
            </div>
          </div>
        )}

        <div className="relative z-[9] flex h-full w-full items-center justify-center">
          <div className="flex h-full w-full max-w-screen-md flex-col items-center overflow-y-auto">
            <div className="z-[99] bg-gradient-to-b from-black via-black/60 to-transparent md:from-transparent md:via-transparent flex flex-col items-center justify-center sticky top-0 inset-x-0 pt-[max(env(safe-area-inset-top),0.75rem)] md:pt-2 w-full px-3 pb-2">
              <span className="weather-cutetext mb-2 text-4xl text-blue-500">
                {lang?.weather || 'Weather'}
              </span>

              <form
                className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 bg-black/10 p-1 text-white shadow backdrop-blur-md backdrop-saturate-200"
                onSubmit={handleSubmit}
              >
                <button
                  aria-label={lang?.city || 'City'}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[margin,background-color,transform] duration-300 hover:mr-1 hover:bg-zinc-700 active:scale-95"
                  onClick={handleResetLocation}
                  type="button"
                >
                  <LocationIcon />
                </button>

                <input
                  className="h-10 w-full border-0 bg-transparent py-2 text-lg font-light text-white outline-none placeholder:text-zinc-200"
                  defaultValue={searchCity || weatherData?.city || ''}
                  key={searchCity || weatherData?.city || 'geo'}
                  name="city"
                  placeholder={lang?.city || 'City'}
                />

                <button
                  aria-label={lang?.city || 'Search'}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] duration-300 hover:bg-zinc-700 active:scale-95"
                  type="submit"
                >
                  <SearchIcon />
                </button>
              </form>

              {/* Quick Select City Chips */}
              <div className="-mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 pt-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  ref={isLocationActive ? activeChipRef : null}
                  type="button"
                  onClick={handleResetLocation}
                  className={`flex items-center gap-1.5 shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 cursor-pointer backdrop-blur-md ${isLocationActive
                    ? 'border-blue-400 bg-blue-500/30 text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                    }`}
                >
                  <LocationIcon />
                  {isLocationActive && weatherData?.city
                    ? weatherData.city
                    : (lang?.weather_my_location || 'Моё местоположение')}
                </button>
                {QUICK_CITIES.map((cityItem) => {
                  const isSelected = !isLocationActive && (
                    searchCity.toLowerCase() === cityItem.name.toLowerCase() ||
                    weatherData?.city?.toLowerCase() === cityItem.name.toLowerCase()
                  );

                  return (
                    <button
                      key={cityItem.name}
                      ref={isSelected ? activeChipRef : null}
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setGeoCoords(null);
                          setSearchCity(cityItem.name);
                        });
                      }}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 backdrop-blur-md cursor-pointer ${isSelected
                        ? 'border-white/80 bg-white/25 text-white font-semibold shadow-md shadow-white/10'
                        : 'border-zinc-600/30 bg-black/20 text-zinc-300 hover:bg-zinc-800/40'
                        }`}
                    >
                      {cityItem.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col justify-center items-center w-full px-3 overflow-visible">
              {showLoadingOverlay && !weatherData ? (
                <WeatherSkeleton />
              ) : (
                <>
                  <span
                    className="-mb-14 -mt-10 flex w-full items-start font-bold text-white/90"
                    style={{ fontSize: 72, textShadow: '0 4px 24px rgba(0, 0, 0, 0.45)' }}
                  >
                    <span style={{ fontSize: 192 }}>{weatherData?.temp ?? '--'}</span>
                    <span className="mt-6">°</span>
                  </span>

                  <span
                    className="w-full text-2xl text-white/90"
                    dangerouslySetInnerHTML={{ __html: weatherData?.mornight || '' }}
                    style={{ textShadow: '0 4px 24px rgba(0, 0, 0, 0.45)' }}
                  />

                  <span
                    className="w-full text-3xl text-zinc-100"
                    style={{ textShadow: '0 4px 24px rgba(0, 0, 0, 0.45)' }}
                  >
                    {weatherData?.weather || ''}
                  </span>

                  {/* Hourly Forecast */}
                  {weatherData?.hourly && weatherData.hourly.length > 0 ? (
                    <div className="mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 bg-black/10 shadow backdrop-blur-md backdrop-saturate-200">
                      <span className="pl-3 pt-3 text-xl text-white">{lang?.weather_hourly || 'Hourly forecast'}</span>
                      <div className="flex w-full gap-6 overflow-x-auto px-3 pb-3">
                        {weatherData.hourly.map((item, index) => (
                          <div key={index} className="flex w-14 shrink-0 flex-col items-center justify-center text-zinc-200">
                            <span className="text-center text-sm font-light text-zinc-300">{item.time}</span>
                            <ForecastIcon iconKey={getForecastIconKey(item.weatherKey)} />
                            <span className="text-center text-lg font-medium">{item.temp}°</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Upcoming Days */}
                  <div className="mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 bg-black/10 shadow backdrop-blur-md backdrop-saturate-200">
                    <span className="pl-3 pt-3 text-xl text-white">{lang?.weather_next_days || 'Upcoming days'}</span>
                    <div className="flex w-full gap-6 overflow-x-auto px-3 pb-3">
                      {forecastEntries.map((entry, index) => (
                        <div key={index} className="flex w-14 flex-col items-center justify-center text-zinc-200">
                          <span className="text-center text-sm">{entry.label}</span>
                          <ForecastIcon iconKey={entry.iconKey} />
                          <span className="text-center text-lg">{entry.temp === null ? '-°' : `${entry.temp}°`}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Atmospheric Details */}
                  {weatherData?.details ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mt-3">
                      <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-3.5 shadow backdrop-blur-md backdrop-saturate-200">
                        <span className="text-xs text-zinc-400 font-medium">{lang?.weather_humidity || 'Влажность'}</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.humidity}</span>
                          <span className="text-sm text-zinc-300">%</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-3.5 shadow backdrop-blur-md backdrop-saturate-200">
                        <span className="text-xs text-zinc-400 font-medium">{lang?.weather_wind || 'Ветер'}</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.windSpeed}</span>
                          <span className="text-xs text-zinc-300">м/с</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-3.5 shadow backdrop-blur-md backdrop-saturate-200">
                        <span className="text-xs text-zinc-400 font-medium">{lang?.weather_pressure || 'Давление'}</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.pressure}</span>
                          <span className="text-xs text-zinc-300">мм</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-3.5 shadow backdrop-blur-md backdrop-saturate-200">
                        <span className="text-xs text-zinc-400 font-medium">{lang?.weather_visibility || 'Видимость'}</span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.visibility}</span>
                          <span className="text-sm text-zinc-300">км</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Sun & Moon Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-3">
                    {/* Sunrise / Sunset / UV Card */}
                    <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-4 shadow backdrop-blur-md backdrop-saturate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xl text-white font-medium">
                          {lang?.weather_sun || 'Sun'}
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                          {lang?.weather_uv || 'UV Index'}: {weatherData?.astro?.uvIndex ?? 3} ({weatherData?.astro?.uvText ?? 'Умеренный'})
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 stroke-amber-400 fill-none stroke-[2] shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v6m-3-3l3-3 3 3M4.93 10.93l1.41 1.41M17.66 12.34l1.41-1.41M2 18h20M20 18a8 8 0 0 0-16 0" />
                          </svg>
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-400">{lang?.weather_sunrise || 'Восход'}</span>
                            <span className="text-xl text-white font-semibold">{weatherData?.astro?.sunrise || '05:30'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 stroke-indigo-300 fill-none stroke-[2] shrink-0" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v6M9 5l3 3 3-3M4.93 10.93l1.41 1.41M17.66 12.34l1.41-1.41M2 18h20M20 18a8 8 0 0 0-16 0" />
                          </svg>
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-400">{lang?.weather_sunset || 'Закат'}</span>
                            <span className="text-xl text-white font-semibold">{weatherData?.astro?.sunset || '21:15'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Moon Phase Card */}
                    <div className="flex flex-col justify-between rounded-3xl border border-zinc-600/30 bg-black/10 p-4 shadow backdrop-blur-md backdrop-saturate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xl text-white font-medium">{lang?.weather_moon || 'Moon phase'}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                          {Math.round(((weatherData?.astro?.moonVal ?? 0.5) > 0.5 ? 1 - (weatherData?.astro?.moonVal ?? 0.5) : (weatherData?.astro?.moonVal ?? 0.5)) * 200)}%
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <svg className="w-8 h-8 fill-purple-300 shrink-0" viewBox="0 0 24 24">
                          <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                        </svg>
                        <div className="flex flex-col">
                          <span className="text-xs text-zinc-400">{lang?.weather_moon || 'Фаза луны'}</span>
                          <span className="text-lg text-white font-semibold">{weatherData?.astro?.moonPhase || 'Полнолуние'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Precipitation Map at the Bottom */}
                  {mapLinks ? (
                    <>
                      <div className="flex w-full items-center justify-center mt-3">
                        <a
                          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-zinc-600/30 bg-blue-400/25 p-3 text-lg font-bold text-white transition-[background-color,transform] duration-300 hover:bg-blue-500/50 active:scale-95 backdrop-blur-md backdrop-saturate-200"
                          href={mapLinks.yandexWeatherUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {lang?.weather_more_precisely_in || 'More precisely in'}
                          <span className="flex items-center justify-center gap-0.5">
                            {locale === 'ru' ? (
                              <>
                                <img
                                  alt="Yandex"
                                  className="h-5 shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/ru_white.6900a042.svg"
                                />
                                <img
                                  alt="Weather"
                                  className="h-5 shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/ru_white.43698d95.svg"
                                />
                              </>
                            ) : (
                              <>
                                <img
                                  alt="Yandex"
                                  className="h-5 shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/com_white.e2f9fd51.svg"
                                />
                                <img
                                  alt="Weather"
                                  className="h-5 shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/weather_white.138770f1.svg"
                                />
                              </>
                            )}
                          </span>
                        </a>
                      </div>

                      <div className="flex w-full items-center justify-center mb-8">
                        <a
                          className="relative mt-3 aspect-square w-full shrink-0 overflow-hidden rounded-3xl border border-zinc-600/30 shadow transition-transform duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200"
                          href={mapLinks.yandexNowcastUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span
                            className="absolute top-3 left-3 z-[99] text-xl text-white"
                            style={{ textShadow: '0 4px 24px rgba(0, 0, 0, 0.45)' }}
                          >
                            {lang?.weather_map || 'Precipitation map'}
                          </span>
                          <Image
                            alt="Map"
                            className="object-cover opacity-90"
                            fill
                            sizes="(min-width: 768px) 768px, 100vw"
                            src={mapLinks.mapUrl}
                            unoptimized
                          />
                          <Image
                            alt="Precipitation overlay"
                            className="object-cover animate-pulse rounded-2xl brightness-125 contrast-200 saturate-200"
                            fill
                            sizes="(min-width: 768px) 768px, 100vw"
                            src={mapLinks.precipUrl}
                            unoptimized
                          />
                        </a>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
