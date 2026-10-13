import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import ServicesContent from './services-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Подключённые сервисы',
  description: 'Настройки безопасности — сайты и приложения, авторизованные через аккаунт Zypo.',
  keywords: ['безопасность', 'сервисы', 'приложения', 'sso', 'oauth', 'доступ'],
  canonical: '/settings/security/services',
});

export default function ConnectedServicesPage() {
  return <ServicesContent />;
}
