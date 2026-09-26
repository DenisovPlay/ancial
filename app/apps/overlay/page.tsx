import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AppsOverlayRedirect } from '../query-redirects';
import { IS_NATIVE_APP } from '../../lib/platform';

type AppsOverlayPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppsOverlayPage({
  searchParams,
}: AppsOverlayPageProps) {
  // Приложение: серверный redirect недоступен в статическом экспорте — переводим на клиенте.
  if (IS_NATIVE_APP) return <Suspense fallback={null}><AppsOverlayRedirect /></Suspense>;
  const params = await searchParams;
  const gameValue = params.gm;
  const game = Array.isArray(gameValue) ? gameValue[0] : gameValue;

  redirect(game ? `/apps/overlay/${encodeURIComponent(game)}` : '/apps');
}
