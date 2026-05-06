import { redirect } from 'next/navigation';

export default function IncludedWeatherPage() {
  redirect('https://ancial.ru/apps/included/weather.php');
}
