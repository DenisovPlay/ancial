import type { Metadata } from 'next';

import { createPageMetadata } from '../seo';
import AppsContent from './apps-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../lib/platform';

export const metadata: Metadata = createPageMetadata({
  canonical: '/apps',
  description: 'Играйте прямо здесь!',
  title: 'ZYNT',
});

// AppsContent's mode/category and query state depend on useSearchParams; static
// generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function AppsPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return <AppsContent />;
}
