import { redirect } from 'next/navigation';

type IncludedWeatherPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function IncludedWeatherPage({
  searchParams,
}: IncludedWeatherPageProps) {
  const resolvedParams = await searchParams;
  const queryString = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedParams)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((val) => queryString.append(key, val));
      } else {
        queryString.append(key, value);
      }
    }
  }

  const query = queryString.toString();
  const dest = `/apps/included/weather.php${query ? `?${query}` : ''}`;

  redirect(dest);
}
