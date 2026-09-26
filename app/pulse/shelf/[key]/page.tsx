import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseShelfContent from './shelf-content';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ key: 'param' });

type PulseShelfPageProps = {
  params: Promise<{ key: string }>;
};

export async function generateMetadata({ params }: PulseShelfPageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { key } = await params;
  return createPageMetadata({
    canonical: `/pulse/shelf/${encodeURIComponent(key)}`,
    description: 'Подборки Zypo Pulse: жанры, настроение и не только. Бесплатно. Без рекламы.',
    title: 'Подборки Pulse',
  });
}

export default async function PulseShelfPage({ params }: PulseShelfPageProps) {
  const { key } = await params;
  return IS_NATIVE_APP ? (
    <AppRouteShell param="key" prop="shelfKey" transform="decode">
      <PulseShelfContent shelfKey={decodeURIComponent(key)} />
    </AppRouteShell>
  ) : <PulseShelfContent shelfKey={decodeURIComponent(key)} />;
}
