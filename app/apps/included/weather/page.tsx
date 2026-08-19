import { createPageMetadata } from '../../../seo';
import WeatherContent from './weather-content';

export const metadata = createPageMetadata({
  title: 'Weather',
  canonical: '/apps/included/weather',
});

type IncludedWeatherPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function IncludedWeatherPage({ searchParams }: IncludedWeatherPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawCity = resolvedSearchParams.city;
  const initialCity = Array.isArray(rawCity) ? rawCity[0] || '' : rawCity || '';

  return <WeatherContent initialCity={initialCity} />;
}
