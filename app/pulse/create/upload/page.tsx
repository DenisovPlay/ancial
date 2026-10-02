import { Suspense } from 'react';

import UploadContent from './upload-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';
import BrandLoader from '../../../components/brand-loader';

// UploadContent's initial mode (single/album) depends directly on useSearchParams;
// static generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseCreateUploadPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense
      fallback={
        <BrandLoader page />
      }
    >
      <UploadContent />
    </Suspense>
  );
}
