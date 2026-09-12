import { Suspense } from 'react';
import WeatherMapContent from './weather-map-content';

export const metadata = {
  title: 'Карта осадков | Weather Map | Zypo',
  description: 'Интерактивная карта осадков и погоды',
};

// WeatherMapContent renders city/temp directly from useSearchParams; static
// generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function WeatherMapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-zinc-950" />}>
      <WeatherMapContent />
    </Suspense>
  );
}
