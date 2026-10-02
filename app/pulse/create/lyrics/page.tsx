import { Suspense } from 'react';

import LyricsContent from './lyrics-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';
import BrandLoader from '../../../components/brand-loader';

// Трек берётся из ?id= через useSearchParams — статическая генерация дала бы расхождение гидратации.

export default async function PulseCreateLyricsPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense
      fallback={
        <BrandLoader page />
      }
    >
      <LyricsContent />
    </Suspense>
  );
}
