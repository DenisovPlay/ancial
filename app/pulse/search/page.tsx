import { Suspense } from 'react';
import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import PulseSearchContent from './search-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../lib/platform';

export const metadata: Metadata = createPageMetadata({
  canonical: '/pulse/search',
  description: 'Поиск артистов, плейлистов и треков в Zypo Pulse.',
  title: 'Поиск Pulse',
});

// PulseSearchContent's render depends on useSearchParams (q); static generation
// causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseSearchPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense fallback={null}>
      <PulseSearchContent />
    </Suspense>
  );
}
