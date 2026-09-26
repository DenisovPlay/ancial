import type { Metadata } from 'next';
import AccountContent from './account-content';
import { createPageMetadata } from '../../../seo';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

export async function generateMetadata(): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  return createPageMetadata({
    canonical: `/wallet/account`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `Счёт`,
  });
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountPage({ params }: PageProps) {
  const { id } = await params;
  return IS_NATIVE_APP ? (
    <AppRouteShell param="id" prop="accountId" transform="int">
      <AccountContent accountId={parseInt(id, 10)} />
    </AppRouteShell>
  ) : <AccountContent accountId={parseInt(id, 10)} />;
}
