import { redirect } from 'next/navigation';
import { AppAliasRedirect } from '../../components/app-route-shell';
import { appShellStaticParams } from '../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../lib/platform';

// Приложение: заготовка-редирект, код берётся из адреса на клиенте.
export const generateStaticParams = appShellStaticParams({ code: 'param' });

export default async function LegacyInviteRedirectPage({
  params,
}: {
  params: Promise<{ code: string }> | { code: string };
}) {
  if (IS_NATIVE_APP) return <AppAliasRedirect />;
  const resolvedParams = await params;
  redirect(`/messages/invite/${encodeURIComponent(resolvedParams?.code || '')}`);
}
