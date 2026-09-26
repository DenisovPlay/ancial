import { Suspense } from 'react';

import EditArtistContent from './edit-artist-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';

// EditArtistContent's title/button text depend directly on useSearchParams (id);
// static generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseCreateEditArtistPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <EditArtistContent />
    </Suspense>
  );
}
