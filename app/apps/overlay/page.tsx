import { redirect } from 'next/navigation';

type AppsOverlayPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppsOverlayPage({
  searchParams,
}: AppsOverlayPageProps) {
  const params = await searchParams;
  const gameValue = params.gm;
  const game = Array.isArray(gameValue) ? gameValue[0] : gameValue;

  redirect(game ? `/apps/overlay/${encodeURIComponent(game)}` : '/apps');
}
