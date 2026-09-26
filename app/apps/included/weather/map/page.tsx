import { Suspense } from 'react';
import WeatherMapContent from './weather-map-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../../lib/platform';

export const metadata = {
  title: 'Карта осадков | Weather Map | Zypo',
  description: 'Интерактивная карта осадков и погоды',
};

// WeatherMapContent renders city/temp directly from useSearchParams; static
// generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function WeatherMapPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense fallback={<div className="h-screen w-full bg-zinc-950" />}>
      <WeatherMapContent />
    </Suspense>
  );
}
