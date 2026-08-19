import type { Metadata } from 'next';
import { Suspense } from 'react';
import PersonContent from './person-content';
import { createPageMetadata } from '../../../seo';
import { CinemaGridSkeleton } from '../../components/cinema-skeleton';

export const metadata: Metadata = createPageMetadata({
  title: 'Персона — Frame',
  description: 'Фильмография и роли персоны на Frame.',
  canonical: '/cinema',
  robots: { index: false, follow: false },
});

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<CinemaGridSkeleton />}>
      <PersonContent personId={id} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return [{ id: "1" }];
}
