import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseSearchArtistsContent from './artists-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search/artists',
  description: 'Все артисты по результатам поиска в Zypo Pulse.',
  title: 'Артисты — Поиск Pulse',
});

// PulseSearchArtistsContent's render depends on useSearchParams (q); static generation
// causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseSearchArtistsPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense fallback={null}>
      <PulseSearchArtistsContent />
    </Suspense>
  );
}
