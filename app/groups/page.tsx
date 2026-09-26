import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import GroupsContent from './groups-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../lib/platform';

export const metadata: Metadata = createPageMetadata({
  title: 'Сообщества',
  description: 'Найдите и подпишитесь на сообщества по интересам — будьте в курсе новостей.',
  keywords: ['сообщества', 'группы', 'подписки', 'клубы'],
  canonical: '/groups',
});

// GroupsContent's search input state depends on useSearchParams (q); static
// generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function GroupsPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return <GroupsContent />;
}
