import type { Metadata } from 'next';
import { Suspense } from 'react';
import WatchContent from './watch-content';
import { createPageMetadata } from '../../../seo';
import { FrameBrandLoader } from '../../components/cinema-skeleton';

export const metadata: Metadata = createPageMetadata({
  title: 'Просмотр — Frame',
  description: 'Смотреть фильм онлайн в высоком качестве на Frame.',
  canonical: '/cinema',
  robots: { index: false, follow: false },
});

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-black flex items-center justify-center"><FrameBrandLoader /></div>}>
      <WatchContent id={id} />
    </Suspense>
  );
}
