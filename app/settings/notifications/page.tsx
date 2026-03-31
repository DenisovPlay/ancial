import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import NotificationsSettingsContent from './notifications-settings-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Уведомления',
  description: 'Настройки уведомлений — управляйте PUSH-уведомлениями и Email-рассылками.',
  keywords: ['уведомления', 'PUSH', 'Email', 'рассылка'],
  canonical: '/settings/notifications',
});

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsContent />;
}
