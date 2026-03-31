import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import NotificationsContent from './notifications-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Уведомления',
  description: 'Просмотр уведомлений — будьте в курсе событий.',
  keywords: ['уведомления', 'оповещения', 'события'],
  canonical: '/notifications',
});

export default function NotificationsPage() {
  return <NotificationsContent />;
}
