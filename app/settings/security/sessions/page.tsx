import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import SessionsContent from './sessions-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Активные сессии',
  description: 'Настройки безопасности — устройства и активные входы в аккаунт.',
  keywords: ['безопасность', 'сессии', 'устройства', 'входы'],
  canonical: '/settings/security/sessions',
});

export default function ActiveSessionsPage() {
  return <SessionsContent />;
}
