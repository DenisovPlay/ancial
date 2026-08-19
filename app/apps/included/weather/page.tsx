import { Suspense } from 'react';
import { createPageMetadata } from '../../../seo';
import WeatherContent from './weather-content';

export const metadata = createPageMetadata({
  title: 'Weather',
  canonical: '/apps/included/weather',
});

export default function IncludedWeatherPage() {
  return (
    <Suspense fallback={null}>
      <WeatherContent />
    </Suspense>
  );
}
