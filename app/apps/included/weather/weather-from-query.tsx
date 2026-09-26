'use client';

import { useSearchParams } from 'next/navigation';

import WeatherContent from './weather-content';

/** Приложение (статический экспорт): город из адреса читается на клиенте, как сервер на сайте. */
export default function WeatherFromQuery() {
  const searchParams = useSearchParams();
  return <WeatherContent initialCity={searchParams.get('city') || ''} />;
}
