import type { Metadata } from 'next';

import UserProfileContent from './profile-content';
import { createPageMetadata } from '../../seo';
import { AppRouteShell } from '../../components/app-route-shell';
import { appShellStaticParams } from '../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ login: 'param' });

type ProfilePageProps = {
  params: Promise<{
    login: string;
  }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { login } = await params;
  const profileHandle = login.trim() || 'profile';

  return createPageMetadata({
    canonical: `/@${encodeURIComponent(profileHandle)}`,
    description: `Профиль @${profileHandle} в Zypo.`,
    openGraph: {
      type: 'profile',
    },
    title: `@${profileHandle}`,
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { login } = await params;

  return IS_NATIVE_APP ? (
    <AppRouteShell param="login" prop="login">
      <UserProfileContent login={login} />
    </AppRouteShell>
  ) : <UserProfileContent login={login} />;
}
