import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import { getOverlayGame } from '../../apps-model';
import AppsOverlay from '../apps-overlay';

type AppsOverlayGamePageProps = {
  params: Promise<{ game: string }>;
};

export async function generateMetadata({
  params,
}: AppsOverlayGamePageProps): Promise<Metadata> {
  const { game } = await params;
  const overlayGame = getOverlayGame(game);

  return createPageMetadata({
    canonical: `/apps/overlay/${encodeURIComponent(game)}`,
    description: 'Тут открываются разные веб-приложения. Да-да, прямо в Ancial.',
    title: overlayGame?.name ?? 'Оверлей',
  });
}

export default async function AppsOverlayGamePage({
  params,
}: AppsOverlayGamePageProps) {
  const { game } = await params;

  return <AppsOverlay gameId={game} />;
}
