import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import AppGuidesContent from './app-guides-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Гайд по приложению',
  description: 'Руководство по использованию приложения Ancial.',
  keywords: ['гайд', 'приложение', 'инструкция', 'Ancial'],
  canonical: '/about/guides/app',
});

export default function AppGuidesPage() {
  return <AppGuidesContent />;
}
