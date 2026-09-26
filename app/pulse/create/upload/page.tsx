import { Suspense } from 'react';

import UploadContent from './upload-content';
import Icon from '../../../components/svg-icon';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../../../lib/platform';

// UploadContent's initial mode (single/album) depends directly on useSearchParams;
// static generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function PulseCreateUploadPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <Icon name="IC-loader" className="inline h-8 w-8 animate-spin fill-zinc-500" />
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
