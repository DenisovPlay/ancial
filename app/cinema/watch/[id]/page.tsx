import type { Metadata } from 'next';
import { Suspense } from 'react';
import WatchContent from './watch-content';
import { createPageMetadata } from '../../../seo';
import { FrameBrandLoader } from '../../components/cinema-skeleton';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

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
      {IS_NATIVE_APP ? (
        <AppRouteShell param="id" prop="id">
          <WatchContent id={id} />
        </AppRouteShell>
      ) : <WatchContent id={id} />}
    </Suspense>
  );
}
