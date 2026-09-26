import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchContent from './search-content';
import { createPageMetadata } from '../../seo';
import { CinemaGridSkeleton } from '../components/cinema-skeleton';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../lib/platform';

export const metadata: Metadata = createPageMetadata({
  title: 'Поиск — Frame',
  description: 'Поиск фильмов, сериалов и аниме на платформе Frame.',
  canonical: '/cinema/search',
  robots: { index: false, follow: false },
});

// SearchContent's initial query state depends on useSearchParams (q); static
// generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function CinemaSearchPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense fallback={<CinemaGridSkeleton />}>
      <SearchContent />
    </Suspense>
  );
}
