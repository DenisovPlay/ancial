import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import GuidesContent from './guides-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Гайды',
  description: 'Руководства и инструкции по использованию Ancial.',
  keywords: ['гайды', 'руководства', 'инструкции', 'помощь'],
  canonical: '/about/guides',
});

export default function GuidesPage() {
  return <GuidesContent />;
}
