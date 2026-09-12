import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import FriendsContent from './friends-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Друзья',
  description: 'Управляйте списком друзей — добавляйте новых, принимайте заявки, общайтесь.',
  keywords: ['друзья', 'контакты', 'список друзей', 'заявки'],
  canonical: '/friends',
});

// FriendsContent's search state and conditional render depend on useSearchParams (q);
// static generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function FriendsPage() {
  return <FriendsContent />;
}
