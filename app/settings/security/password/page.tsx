import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import PasswordContent from './password-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Смена пароля',
  description: 'Настройки безопасности — изменение пароля учетной записи.',
  keywords: ['безопасность', 'пароль', 'смена пароля'],
  canonical: '/settings/security/password',
});

export default function PasswordSettingsPage() {
  return <PasswordContent />;
}
