import type { Metadata } from 'next';
import WatchContent from './watch-content';
import { createPageMetadata } from '../../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Просмотр — Frame',
  description: 'Смотреть фильм онлайн в высоком качестве на Frame.',
  canonical: '/cinema',
  robots: { index: false, follow: false },
});

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WatchContent id={id} />;
}
