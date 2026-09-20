import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import PasskeysContent from './passkeys-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Passkeys',
  description: 'Настройки безопасности — вход по passkey (WebAuthn).',
  keywords: ['безопасность', 'passkey', 'webauthn', 'ключ доступа'],
  canonical: '/settings/security/passkeys',
});

export default function PasskeysPage() {
  return <PasskeysContent />;
}
