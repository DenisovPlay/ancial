import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import SecurityContent from './security-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Безопасность',
  description: 'Настройки безопасности — измените пароль, настройте двухфакторную аутентификацию.',
  keywords: ['безопасность', 'пароль', '2FA', 'аутентификация'],
  canonical: '/settings/security',
});

export default function SecuritySettingsPage() {
  return <SecurityContent />;
}
