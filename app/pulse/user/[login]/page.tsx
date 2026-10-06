import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import PulseUserPlaylistsContent from './user-playlists-content';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный логин берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ login: 'param' });

type PulseUserPageProps = {
  params: Promise<{ login: string }>;
};

export async function generateMetadata({ params }: PulseUserPageProps): Promise<Metadata> {
  if (IS_NATIVE_APP) return {};
  const { login } = await params;
  return createPageMetadata({
    canonical: `/pulse/user/${encodeURIComponent(login)}`,
    description: 'Плейлисты пользователя в Zypo Pulse. Бесплатно. Без рекламы.',
    title: 'Плейлисты пользователя',
  });
}

export default async function PulseUserPlaylistsPage({ params }: PulseUserPageProps) {
  const { login } = await params;
  return IS_NATIVE_APP ? (
    <AppRouteShell param="login" prop="login" transform="decode">
      <PulseUserPlaylistsContent login={decodeURIComponent(login)} />
    </AppRouteShell>
  ) : <PulseUserPlaylistsContent login={decodeURIComponent(login)} />;
}
