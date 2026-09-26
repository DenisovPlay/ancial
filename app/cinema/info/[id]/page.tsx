import type { Metadata } from 'next';
import InfoContent from './info-content';
import { createPageMetadata } from '../../../seo';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { id } = await params;

  return createPageMetadata({
    title: 'Информация о фильме — Frame',
    description: 'Подробная информация о фильме или сериале на платформе Frame.',
    canonical: `/cinema/info/${id}`,
    robots: { index: false, follow: false },
  });
}

export default async function CinemaInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return IS_NATIVE_APP ? (
    <AppRouteShell param="id" prop="id">
      <InfoContent id={id} />
    </AppRouteShell>
  ) : <InfoContent id={id} />;
}
