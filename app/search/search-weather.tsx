'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';

import { detectWeatherKey, isDayTime, type WeatherConditionKey } from '../apps/included/weather/weather-model';
import { readCachedWeather, readLastCity, readWeatherBackup } from '../lib/home-info-cache';

type Lang = Record<string, string> | null | undefined;

const subscribeNothing = () => () => {};

/** Погода из localStorage (кэш главной): строкой, чтобы снимок был стабилен между рендерами; на сервере — пусто. */
function readSnapshot(): string {
  try {
    const city = readLastCity() ?? '';
    const data = (city ? readCachedWeather(city) : null) ?? readWeatherBackup();
    return JSON.stringify({ city: data?.city || city, day: isDayTime(), temp: data?.temp ?? null, weather: data?.weather ?? '' });
  } catch {
    return '';
  }
}

const CLOUD = 'M19 47a9 9 0 0 1-1.4-17.9A13 13 0 0 1 43 26.5 10.5 10.5 0 0 1 45 47z';

/** Живая иконка: только CSS-анимации (.wx-*), уважают «уменьшить движение». */
function WeatherScene({ day, kind }: { day: boolean; kind: WeatherConditionKey }) {
  const sun = (cx: number, cy: number, r: number, scale = 1) => (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <g className="wx-spin" stroke="#fcd34d" strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1={-(r + 5)} x2="0" y2={-(r + 10)} transform={`rotate(${i * 45})`} />
        ))}
      </g>
      <circle className="wx-pulse" r={r} fill="#fcd34d" />
    </g>
  );
  const moon = (
    <g>
      <path className="wx-pulse" d="M40 34a14 14 0 1 1-14-20 11 11 0 0 0 14 20z" fill="#e4e4e7" />
      <circle className="wx-twinkle" cx="47" cy="17" r="1.6" fill="#fff" />
      <circle className="wx-twinkle wx-d2" cx="52" cy="29" r="1.2" fill="#fff" />
      <circle className="wx-twinkle wx-d3" cx="20" cy="12" r="1.2" fill="#fff" />
    </g>
  );

  let content: React.ReactNode;
  if (kind === 'clear') {
    content = day ? sun(32, 32, 10) : <g transform="translate(0 6)">{moon}</g>;
  } else if (kind === 'rain') {
    content = (
      <>
        <path className="wx-drift" d={CLOUD} transform="translate(0 -6)" fill="#d4d4d8" />
        {[0, 1, 2].map((i) => (
          <line key={i} className={`wx-drop wx-d${i + 1}`} x1={24 + i * 9} y1="46" x2={22 + i * 9} y2="52" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" />
        ))}
      </>
    );
  } else if (kind === 'snow') {
    content = (
      <>
        <path className="wx-drift" d={CLOUD} transform="translate(0 -6)" fill="#d4d4d8" />
        {[0, 1, 2].map((i) => (
          <circle key={i} className={`wx-flake wx-d${i + 1}`} cx={24 + i * 9} cy="46" r="2.2" fill="#fff" />
        ))}
      </>
    );
  } else if (kind === 'fog') {
    content = (
      <g stroke="#d4d4d8" strokeWidth="3.5" strokeLinecap="round">
        <line className="wx-fog" x1="14" y1="24" x2="46" y2="24" />
        <line className="wx-fog wx-d2" x1="20" y1="34" x2="52" y2="34" />
        <line className="wx-fog wx-d3" x1="14" y1="44" x2="42" y2="44" />
      </g>
    );
  } else {
    // cloudy / default: солнце выглядывает из-за дрейфующего облака
    content = (
      <>
        {day ? sun(40, 24, 8, 0.9) : <g transform="translate(6 -2) scale(0.7)">{moon}</g>}
        <path className="wx-drift" d={CLOUD} transform="translate(0 -2)" fill={kind === 'cloudy' ? '#d4d4d8' : '#e4e4e7'} />
      </>
    );
  }

  return (
    <svg viewBox="6 4 52 52" className="h-14 w-14 shrink-0 lg:h-16 lg:w-16" aria-hidden>
      {content}
    </svg>
  );
}

/** Виджет «Погода» над выдачей на запрос «погода»: данные из кэша главной (если есть) и кнопка в приложение. */
export default function SearchWeather({ lang }: { lang: Lang }) {
  const snapshot = useSyncExternalStore(subscribeNothing, readSnapshot, () => '');
  const data = useMemo(() => {
    if (!snapshot) return null;
    try {
      return JSON.parse(snapshot) as { city: string; day: boolean; temp: number | null; weather: string };
    } catch {
      return null;
    }
  }, [snapshot]);

  const hasTemp = data?.temp !== null && data?.temp !== undefined;
  const kind = detectWeatherKey(data?.weather);
  const description = data?.weather ? data.weather.charAt(0).toUpperCase() + data.weather.slice(1) : '';

  return (
    <section className="flex w-full items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
      <WeatherScene day={data?.day ?? true} kind={hasTemp ? kind : 'default'} />
      <div className="flex min-w-0 flex-1 flex-col">
        {data?.city ? <span className="truncate text-sm text-zinc-400 lg:text-base">{data.city}</span> : null}
        {hasTemp ? (
          <>
            <span className="text-3xl font-black leading-none text-white lg:text-4xl">{`${data?.temp}°C`}</span>
            {description ? <span className="truncate text-sm text-zinc-300 lg:text-base">{description}</span> : null}
          </>
        ) : (
          <span className="text-sm text-zinc-300 lg:text-lg">{lang?.search_weather_hint || 'Прогноз на сегодня и ближайшие дни'}</span>
        )}
      </div>
      <Link
        href="/apps/overlay/weather"
        className="shrink-0 cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-700 px-4 py-2 text-sm font-semibold text-white duration-300 hover:bg-zinc-600 lg:px-5 lg:text-base active:scale-95"
      >
        {lang?.search_weather_open || 'Открыть'}
      </Link>
    </section>
  );
}
