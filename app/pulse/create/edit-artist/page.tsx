import { Suspense } from 'react';

import EditArtistContent from './edit-artist-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';
import BrandLoader from '../../../components/brand-loader';

// EditArtistContent's title/button text depend directly on useSearchParams (id);
// static generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseCreateEditArtistPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense
      fallback={
        <BrandLoader page />
      }
    >
      <EditArtistContent />
    </Suspense>
  );
}
