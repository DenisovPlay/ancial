import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import { getOverlayGame } from '../../apps-model';
import AppsOverlay from '../apps-overlay';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ game: 'param' });

type AppsOverlayGamePageProps = {
  params: Promise<{ game: string }>;
};

export async function generateMetadata({
  params,
}: AppsOverlayGamePageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { game } = await params;
  const overlayGame = getOverlayGame(game);

  return createPageMetadata({
    canonical: `/apps/overlay/${encodeURIComponent(game)}`,
    description: 'Тут открываются разные веб-приложения. Да-да, прямо в Zypo.',
    title: overlayGame?.name ?? 'Оверлей',
  });
}

export default async function AppsOverlayGamePage({
  params,
}: AppsOverlayGamePageProps) {
  const { game } = await params;

  return IS_NATIVE_APP ? (
    <AppRouteShell param="game" prop="gameId">
      <AppsOverlay gameId={game} />
    </AppRouteShell>
  ) : <AppsOverlay gameId={game} />;
}
