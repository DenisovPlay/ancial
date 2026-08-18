import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import PrivacySecurityContent from './privacy-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Конфиденциальность',
  description: 'Настройки приватности — видимость активности, профиля и статус в сети.',
  keywords: ['безопасность', 'приватность', 'конфиденциальность', 'видимость'],
  canonical: '/settings/security/privacy',
});

export default function PrivacySecurityPage() {
  return <PrivacySecurityContent />;
}
