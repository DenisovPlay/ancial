import { createPageMetadata } from '../../../seo';
import { Suspense } from 'react';
import WeatherContent from './weather-content';
import WeatherFromQuery from './weather-from-query';
import { IS_NATIVE_APP } from '../../../lib/platform';

export const metadata = createPageMetadata({
  title: 'Weather',
  canonical: '/apps/included/weather',
});

type IncludedWeatherPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function IncludedWeatherPage({ searchParams }: IncludedWeatherPageProps) {
  // Приложение: серверных searchParams в статическом экспорте нет — читаем на клиенте.
  if (IS_NATIVE_APP) return <Suspense fallback={null}><WeatherFromQuery /></Suspense>;
  const resolvedSearchParams = await searchParams;
  const rawCity = resolvedSearchParams.city;
  const initialCity = Array.isArray(rawCity) ? rawCity[0] || '' : rawCity || '';

  return <WeatherContent initialCity={initialCity} />;
}
