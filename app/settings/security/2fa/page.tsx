import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import TwoFactorContent from './twofa-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Двухфакторная защита',
  description: 'Настройки безопасности — двухфакторная аутентификация (2FA).',
  keywords: ['безопасность', '2FA', 'двухфакторная аутентификация', 'TOTP'],
  canonical: '/settings/security/2fa',
});

export default function TwoFactorPage() {
  return <TwoFactorContent />;
}
