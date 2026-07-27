import { Suspense } from 'react';
import WeatherMapContent from './weather-map-content';

export const metadata = {
  title: 'Карта осадков | Weather Map | Zypo',
  description: 'Интерактивная карта осадков и погоды',
};

export default function WeatherMapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-zinc-950" />}>
      <WeatherMapContent />
    </Suspense>
  );
}
