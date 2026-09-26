import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import FriendsContent from './friends-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from '../lib/platform';

export const metadata: Metadata = createPageMetadata({
  title: 'Друзья',
  description: 'Управляйте списком друзей — добавляйте новых, принимайте заявки, общайтесь.',
  keywords: ['друзья', 'контакты', 'список друзей', 'заявки'],
  canonical: '/friends',
});

// FriendsContent's search state and conditional render depend on useSearchParams (q);
// static generation causes a hydration mismatch in prod when the URL carries real query params.

export default async function FriendsPage() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return <FriendsContent />;
}
