import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import MobileAppContent from './mobile-app-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Мобильное приложение',
  description: 'Zypo для Android и iPhone: лента, чаты, звонки и музыка — всегда с собой.',
  keywords: ['приложение', 'Android', 'APK', 'iOS', 'iPhone', 'Zypo'],
  canonical: '/app/mobile',
});

export default function MobileAppPage() {
  return <MobileAppContent />;
}
