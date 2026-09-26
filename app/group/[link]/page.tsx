import type { Metadata } from 'next';

import GroupProfileContent from './group-content';
import { createPageMetadata } from '../../seo';
import { AppRouteShell } from '../../components/app-route-shell';
import { appShellStaticParams } from '../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ link: 'param' });

type GroupPageProps = {
  params: Promise<{
    link: string;
  }>;
};

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { link } = await params;
  const groupHandle = link.trim() || 'group';

  return createPageMetadata({
    canonical: `/$${encodeURIComponent(groupHandle)}`,
    description: `Сообщество $${groupHandle} в Zypo.`,
    title: `$${groupHandle}`,
  });
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { link } = await params;

  return IS_NATIVE_APP ? (
    <AppRouteShell param="link" prop="link">
      <GroupProfileContent link={link} />
    </AppRouteShell>
  ) : <GroupProfileContent link={link} />;
}
