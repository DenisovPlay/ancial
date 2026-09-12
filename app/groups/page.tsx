import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import GroupsContent from './groups-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Сообщества',
  description: 'Найдите и подпишитесь на сообщества по интересам — будьте в курсе новостей.',
  keywords: ['сообщества', 'группы', 'подписки', 'клубы'],
  canonical: '/groups',
});

// GroupsContent's search input state depends on useSearchParams (q); static
// generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function GroupsPage() {
  return <GroupsContent />;
}
