'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import AppImage from '../../../components/app-image';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { cache } from '../../../lib/cache';
import { safeFetchJson } from '../../../lib/safe-fetch-json';
import { sanitizeUserHtml } from '../../../lib/sanitize-html';
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
import Icon from '../../../components/svg-icon';

type WeatherApiResponse = {
  success: boolean;
  data: WeatherAppData | null;
  error: string | null;
};

function WeatherSkeleton() {
  return (
    <div className="flex flex-col items-center w-full animate-pulse">
      {/* Big Temperature Skeleton - aligned to left matching real font size */}
      <div className="-mb-14 flex w-full items-start gap-1">
        <div className="glass-panel [--glass-tint:var(--color-white)] [--glass-alpha:0.15] h-44 w-52 rounded-3xl" />
        <div className="h-12 w-8 rounded-2xl bg-white/15 mt-6" />
      </div>

      {/* Mornight & Weather status text skeleton - left aligned */}
      <div className="mt-6 flex w-full flex-col items-start gap-2">
        <div className="glass-panel [--glass-tint:var(--color-white)] [--glass-alpha:0.15] h-7 w-44 rounded-full" />
        <div className="glass-panel [--glass-tint:var(--color-white)] [--glass-alpha:0.15] h-8 w-36 rounded-full" />
      </div>

      {/* Hourly forecast skeleton */}
      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] mt-4 flex w-full flex-col rounded-3xl border border-zinc-600/30 p-3 shadow">
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
      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 p-3 shadow">
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
          <div key={i} className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] flex flex-col justify-between h-20 rounded-3xl border border-zinc-600/30 p-3.5 shadow">
            <div className="h-3 w-16 rounded bg-white/15" />
            <div className="h-6 w-20 rounded bg-white/15 mt-2" />
          </div>
        ))}
      </div>

      {/* Sun & Moon cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-3 mb-8">
        <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] h-32 rounded-3xl border border-zinc-600/30 p-4 shadow flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-5 w-20 rounded bg-white/15" />
            <div className="h-5 w-28 rounded-full bg-white/15" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="h-10 rounded-xl bg-white/15" />
            <div className="h-10 rounded-xl bg-white/15" />
          </div>
        </div>
        <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] h-32 rounded-3xl border border-zinc-600/30 p-4 shadow flex flex-col justify-between">
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

/** Иконка прогноза из спрайта; всё, что не облако/снег/дождь, — солнце. */
const FORECAST_ICONS: Partial<Record<WeatherForecastIconKey, string>> = {
  cloud: 'IC-weather-cloud',
  snow: 'IC-weather-snow',
  rain: 'IC-weather-rain',
};

function ForecastIcon({ iconKey }: { iconKey: WeatherForecastIconKey }) {
  return <Icon name={FORECAST_ICONS[iconKey] ?? 'IC-weather-sun'} className="h-10 w-10 fill-white" />;
}

type RecommendedCity = {
  name: string;
  labelRu: string;
  labelEn: string;
  lat: number;
  lon: number;
  pop: number;
};

const RECOMMENDED_CITIES: RecommendedCity[] = [
  // Россия и СНГ
  { name: 'Москва', labelRu: 'Москва', labelEn: 'Moscow', lat: 55.7558, lon: 37.6173, pop: 13100000 },
  { name: 'Санкт-Петербург', labelRu: 'СПБ', labelEn: 'St. Petersburg', lat: 59.9343, lon: 30.3351, pop: 5600000 },
  { name: 'Новосибирск', labelRu: 'Новосибирск', labelEn: 'Novosibirsk', lat: 55.0084, lon: 82.9357, pop: 1630000 },
  { name: 'Екатеринбург', labelRu: 'Екатеринбург', labelEn: 'Yekaterinburg', lat: 56.8389, lon: 60.6057, pop: 1540000 },
  { name: 'Казань', labelRu: 'Казань', labelEn: 'Kazan', lat: 55.7887, lon: 49.1221, pop: 1310000 },
  { name: 'Нижний Новгород', labelRu: 'Н. Новгород', labelEn: 'N. Novgorod', lat: 56.3269, lon: 44.0059, pop: 1220000 },
  { name: 'Челябинск', labelRu: 'Челябинск', labelEn: 'Chelyabinsk', lat: 55.1644, lon: 61.4368, pop: 1180000 },
  { name: 'Красноярск', labelRu: 'Красноярск', labelEn: 'Krasnoyarsk', lat: 56.0153, lon: 92.8932, pop: 1190000 },
  { name: 'Самара', labelRu: 'Самара', labelEn: 'Samara', lat: 53.2001, lon: 50.1500, pop: 1160000 },
  { name: 'Уфа', labelRu: 'Уфа', labelEn: 'Ufa', lat: 54.7388, lon: 55.9721, pop: 1140000 },
  { name: 'Ростов-на-Дону', labelRu: 'Ростов', labelEn: 'Rostov', lat: 47.2357, lon: 39.7015, pop: 1140000 },
  { name: 'Краснодар', labelRu: 'Краснодар', labelEn: 'Krasnodar', lat: 45.0355, lon: 38.9753, pop: 1120000 },
  { name: 'Сочи', labelRu: 'Сочи', labelEn: 'Sochi', lat: 43.6028, lon: 39.7342, pop: 440000 },
  { name: 'Владивосток', labelRu: 'Владивосток', labelEn: 'Vladivostok', lat: 43.1155, lon: 131.8855, pop: 600000 },
  { name: 'Минск', labelRu: 'Минск', labelEn: 'Minsk', lat: 53.9006, lon: 27.5590, pop: 2000000 },
  { name: 'Алматы', labelRu: 'Алматы', labelEn: 'Almaty', lat: 43.2389, lon: 76.8897, pop: 2150000 },
  { name: 'Астана', labelRu: 'Астана', labelEn: 'Astana', lat: 51.1694, lon: 71.4491, pop: 1350000 },
  { name: 'Ташкент', labelRu: 'Ташкент', labelEn: 'Tashkent', lat: 41.2995, lon: 69.2401, pop: 2900000 },
  { name: 'Тбилиси', labelRu: 'Тбилиси', labelEn: 'Tbilisi', lat: 41.7151, lon: 44.8271, pop: 1200000 },
  { name: 'Ереван', labelRu: 'Ереван', labelEn: 'Yerevan', lat: 40.1872, lon: 44.5152, pop: 1100000 },
  { name: 'Баку', labelRu: 'Баку', labelEn: 'Baku', lat: 40.4093, lon: 49.8671, pop: 2300000 },

  // Европа и Турция
  { name: 'Стамбул', labelRu: 'Стамбул', labelEn: 'Istanbul', lat: 41.0082, lon: 28.9784, pop: 15800000 },
  { name: 'Лондон', labelRu: 'Лондон', labelEn: 'London', lat: 51.5074, lon: -0.1278, pop: 8900000 },
  { name: 'Париж', labelRu: 'Париж', labelEn: 'Paris', lat: 48.8566, lon: 2.3522, pop: 2100000 },
  { name: 'Берлин', labelRu: 'Берлин', labelEn: 'Berlin', lat: 52.5200, lon: 13.4050, pop: 3600000 },
  { name: 'Рим', labelRu: 'Рим', labelEn: 'Rome', lat: 41.9028, lon: 12.4964, pop: 2800000 },
  { name: 'Мадрид', labelRu: 'Мадрид', labelEn: 'Madrid', lat: 40.4168, lon: -3.7038, pop: 3300000 },
  { name: 'Амстердам', labelRu: 'Амстердам', labelEn: 'Amsterdam', lat: 52.3676, lon: 4.9041, pop: 870000 },
  { name: 'Варшава', labelRu: 'Варшава', labelEn: 'Warsaw', lat: 52.2297, lon: 21.0122, pop: 1800000 },
  { name: 'Прага', labelRu: 'Прага', labelEn: 'Prague', lat: 50.0755, lon: 14.4378, pop: 1300000 },

  // Азия и Ближний Восток
  { name: 'Токио', labelRu: 'Токио', labelEn: 'Tokyo', lat: 35.6762, lon: 139.6503, pop: 14000000 },
  { name: 'Пекин', labelRu: 'Пекин', labelEn: 'Beijing', lat: 39.9042, lon: 116.4074, pop: 21500000 },
  { name: 'Дубай', labelRu: 'Дубай', labelEn: 'Dubai', lat: 25.2048, lon: 55.2708, pop: 3500000 },
  { name: 'Бангкок', labelRu: 'Бангкок', labelEn: 'Bangkok', lat: 13.7563, lon: 100.5018, pop: 10500000 },
  { name: 'Сингапур', labelRu: 'Сингапур', labelEn: 'Singapore', lat: 1.3521, lon: 103.8198, pop: 5600000 },

  // Америка
  { name: 'Нью-Йорк', labelRu: 'Нью-Йорк', labelEn: 'New York', lat: 40.7128, lon: -74.0060, pop: 8800000 },
  { name: 'Лос-Анджелес', labelRu: 'Лос-Анджелес', labelEn: 'Los Angeles', lat: 34.0522, lon: -118.2437, pop: 3800000 },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  const sortedNearbyCities = useMemo(() => {
    const userLat = weatherData?.coordinates?.lat ?? geoCoords?.lat;
    const userLon = weatherData?.coordinates?.lon ?? geoCoords?.lon;

    if (userLat !== undefined && userLon !== undefined && (userLat !== 0 || userLon !== 0)) {
      return [...RECOMMENDED_CITIES]
        .sort((a, b) => {
          const distA = calculateDistanceKm(userLat, userLon, a.lat, a.lon);
          const distB = calculateDistanceKm(userLat, userLon, b.lat, b.lon);
          return distA - distB;
        })
        .slice(0, 10);
    }

    return [...RECOMMENDED_CITIES]
      .sort((a, b) => b.pop - a.pop)
      .slice(0, 10);
  }, [weatherData?.coordinates?.lat, weatherData?.coordinates?.lon, geoCoords?.lat, geoCoords?.lon]);

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
            className="z-[-1] absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        )}

        <div className="absolute inset-0 hidden bg-gradient-to-r from-black via-black/10 to-transparent md:flex" />
        <div className="absolute inset-0 hidden bg-gradient-to-l from-black via-black/10 to-transparent md:flex" />
        <div className="absolute inset-0 bg-black/50" />

        {!showLoadingOverlay && errorMessage && (
          <div className="absolute inset-0 z-[999] overflow-hidden">
            <div className="glass-panel [--glass-alpha:0.8] [--glass-blur:8px] flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden p-3 text-center">
              <Icon name="IC-weather-close" className="inline h-24 w-24 fill-white" />
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
                className="glass-input [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 p-1 text-white shadow"
                onSubmit={handleSubmit}
              >
                <button
                  aria-label={lang?.city || 'City'}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[margin,background-color,transform] duration-300 hover:mr-1 hover:bg-zinc-700 active:scale-95"
                  onClick={handleResetLocation}
                  type="button"
                >
                  <Icon name="IC-location" className="inline h-7 w-7 fill-white" />
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
                  <Icon name="IC-search" className="inline h-7 w-7 fill-white" />
                </button>
              </form>

              {/* Quick Select City Chips - Dynamically Recommended Nearby Cities */}
              <div className="-mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 pt-2 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {sortedNearbyCities.map((cityItem) => {
                  const isSelected = !isLocationActive && (
                    searchCity.toLowerCase() === cityItem.name.toLowerCase() ||
                    weatherData?.city?.toLowerCase() === cityItem.name.toLowerCase()
                  );
                  const chipLabel = langCode === 'en' ? cityItem.labelEn : cityItem.labelRu;

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
                      className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 glass-panel cursor-pointer ${isSelected
                        ? 'border-white/80 [--glass-tint:var(--color-white)] [--glass-alpha:0.25] text-white font-semibold shadow-md shadow-white/10'
                        : 'border-zinc-600/30 [--glass-tint:var(--color-black)] [--glass-alpha:0.2] text-zinc-300 hover:bg-zinc-800/40'
                        }`}
                    >
                      {chipLabel}
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
                    dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(weatherData?.mornight || '') }}
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
                    <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 shadow">
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
                  <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] mt-3 flex w-full flex-col rounded-3xl border border-zinc-600/30 shadow">
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
                      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-3.5 shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-medium">{lang?.weather_humidity || 'Влажность'}</span>
                          <Icon name="IC-weather-humidity" className="w-4 h-4 fill-cyan-400/80 shrink-0" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.humidity}</span>
                          <span className="text-sm text-zinc-300">%</span>
                        </div>
                      </div>

                      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-3.5 shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-medium">{lang?.weather_wind || 'Ветер'}</span>
                          <Icon name="IC-weather-wind" className="w-4 h-4 stroke-teal-300 fill-none stroke-[2] shrink-0" strokeLinecap="round" strokeLinejoin="round" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.windSpeed}</span>
                          <span className="text-xs text-zinc-300">м/с</span>
                        </div>
                      </div>

                      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-3.5 shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-medium">{lang?.weather_pressure || 'Давление'}</span>
                          <Icon name="IC-weather-pressure" className="w-4 h-4 stroke-amber-300 fill-none stroke-[2] shrink-0" strokeLinecap="round" strokeLinejoin="round" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl text-white font-semibold">{weatherData.details.pressure}</span>
                          <span className="text-xs text-zinc-300">мм</span>
                        </div>
                      </div>

                      <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-3.5 shadow">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-medium">{lang?.weather_visibility || 'Видимость'}</span>
                          <Icon name="IC-weather-visibility" className="w-4 h-4 stroke-sky-300 fill-none stroke-[2] shrink-0" strokeLinecap="round" strokeLinejoin="round" />
                        </div>
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
                    <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-4 shadow">
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
                          <Icon name="IC-weather-sunrise" className="w-8 h-8 stroke-amber-400 fill-none stroke-[2] shrink-0" strokeLinecap="round" strokeLinejoin="round" />
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-400">{lang?.weather_sunrise || 'Восход'}</span>
                            <span className="text-xl text-white font-semibold">{weatherData?.astro?.sunrise || '05:30'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Icon name="IC-weather-sunset" className="w-8 h-8 stroke-indigo-300 fill-none stroke-[2] shrink-0" strokeLinecap="round" strokeLinejoin="round" />
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-400">{lang?.weather_sunset || 'Закат'}</span>
                            <span className="text-xl text-white font-semibold">{weatherData?.astro?.sunset || '21:15'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Moon Phase Card */}
                    <div className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.1] [--glass-sat:2] flex flex-col justify-between rounded-3xl border border-zinc-600/30 p-4 shadow">
                      <div className="flex items-center justify-between">
                        <span className="text-xl text-white font-medium">{lang?.weather_moon || 'Moon phase'}</span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                          {Math.round(((weatherData?.astro?.moonVal ?? 0.5) > 0.5 ? 1 - (weatherData?.astro?.moonVal ?? 0.5) : (weatherData?.astro?.moonVal ?? 0.5)) * 200)}%
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <Icon name="IC-weather-moon" className="w-8 h-8 fill-purple-300 shrink-0" />
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
                          className="glass-panel [--glass-tint:var(--color-blue-400)] [--glass-alpha:0.25] [--glass-sat:2] flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-zinc-600/30 p-3 text-lg font-bold text-white transition-[background-color,transform] duration-300 hover:[--glass-tint:var(--color-blue-500)] hover:[--glass-alpha:0.5] active:scale-95"
                          href={mapLinks.yandexWeatherUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {lang?.weather_more_precisely_in || 'More precisely in'}
                          <span className="flex items-center justify-center gap-0.5">
                            {locale === 'ru' ? (
                              <>
                                <AppImage
                                  width={80}
                                  height={20}
                                  alt="Yandex"
                                  className="h-5 w-auto shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/ru_white.6900a042.svg"
                                />
                                <AppImage
                                  width={80}
                                  height={20}
                                  alt="Weather"
                                  className="h-5 w-auto shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/ru_white.43698d95.svg"
                                />
                              </>
                            ) : (
                              <>
                                <AppImage
                                  width={80}
                                  height={20}
                                  alt="Yandex"
                                  className="h-5 w-auto shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/com_white.e2f9fd51.svg"
                                />
                                <AppImage
                                  width={80}
                                  height={20}
                                  alt="Weather"
                                  className="h-5 w-auto shrink-0"
                                  src="https://yastatic.net/s3/weather-frontend/front2/_next/static/media/weather_white.138770f1.svg"
                                />
                              </>
                            )}
                          </span>
                        </a>
                      </div>

                      <div className="flex w-full items-center justify-center mb-8">
                        <Link
                          className="glass-panel [--glass-alpha:0] [--glass-sat:2] relative mt-3 aspect-square w-full shrink-0 overflow-hidden rounded-3xl border border-zinc-600/30 shadow transition-transform duration-300 active:scale-95 cursor-pointer group"
                          href={`/apps/overlay/weather/map?lat=${weatherData?.coordinates?.lat ?? 55.7558}&lon=${weatherData?.coordinates?.lon ?? 37.6173}&city=${encodeURIComponent(weatherData?.city ?? '')}&temp=${weatherData?.temp ?? 0}&mode=${mode}`}
                        >
                          <span
                            className="absolute top-3 left-3 z-[99] text-xl text-white font-medium"
                            style={{ textShadow: '0 4px 24px rgba(0, 0, 0, 0.45)' }}
                          >
                            {lang?.weather_map || 'Precipitation map'}
                          </span>
                          <span className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.6] absolute bottom-3 right-3 z-[99] text-xs px-3 py-1.5 rounded-full text-white border border-white/20 flex items-center gap-1 group-hover:[--glass-tint:var(--color-blue-600)] group-hover:[--glass-alpha:0.8] transition-colors">
                            <span>{langCode === 'en' ? 'Open interactive map' : 'Открыть интерактивную карту'}</span>
                            <Icon name="IC-arrow-right" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" />
                          </span>
                          <AppImage
                            alt="Map"
                            className="object-cover opacity-90"
                            fill
                            sizes="(min-width: 768px) 768px, 100vw"
                            src={mapLinks.mapUrl}
                            unoptimized
                          />
                          <AppImage
                            skeleton={false}
                            alt="Precipitation overlay"
                            className="object-cover animate-pulse rounded-2xl brightness-125 contrast-200 saturate-200"
                            fill
                            sizes="(min-width: 768px) 768px, 100vw"
                            src={mapLinks.precipUrl}
                            unoptimized
                          />
                        </Link>
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
