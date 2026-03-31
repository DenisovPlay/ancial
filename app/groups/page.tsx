import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import GroupsContent from './groups-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Сообщества',
  description: 'Найдите и подпишитесь на сообщества по интересам — будьте в курсе новостей.',
  keywords: ['сообщества', 'группы', 'подписки', 'клубы'],
  canonical: '/groups',
});

export default function GroupsPage() {
  return <GroupsContent />;
}
