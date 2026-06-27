import type { Metadata } from 'next';
import AboutContent from './about-content';
import { createPageMetadata } from '../../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/merchant/about`,
    description: `Управление настройками мерчанта и просмотр операций.`,
    title: `Настройки мерчанта`,
  });
}

export default function AboutPage() {
  return <AboutContent />;
}
