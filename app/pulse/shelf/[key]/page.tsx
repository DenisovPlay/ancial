import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseShelfContent from './shelf-content';

type PulseShelfPageProps = {
  params: Promise<{ key: string }>;
};

export async function generateMetadata({ params }: PulseShelfPageProps): Promise<Metadata> {
  const { key } = await params;
  return createPageMetadata({
    canonical: `/pulse/shelf/${encodeURIComponent(key)}`,
    description: 'Подборки Zypo Pulse: жанры, настроение и не только. Бесплатно. Без рекламы.',
    title: 'Подборки Pulse',
  });
}

export default async function PulseShelfPage({ params }: PulseShelfPageProps) {
  const { key } = await params;
  return <PulseShelfContent shelfKey={decodeURIComponent(key)} />;
}
