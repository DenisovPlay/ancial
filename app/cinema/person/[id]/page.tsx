import type { Metadata } from 'next';
import { Suspense } from 'react';
import PersonContent from './person-content';
import { createPageMetadata } from '../../../seo';
import { CinemaGridSkeleton } from '../../components/cinema-skeleton';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

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
      {IS_NATIVE_APP ? (
        <AppRouteShell param="id" prop="personId">
          <PersonContent personId={id} />
        </AppRouteShell>
      ) : <PersonContent personId={id} />}
    </Suspense>
  );
}
