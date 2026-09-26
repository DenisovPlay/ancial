import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import { redirect } from 'next/navigation';
import { AppAliasRedirect } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: заготовка-редирект, категория берётся из адреса на клиенте.
export const generateStaticParams = appShellStaticParams({ category: 'param' });

type AppsCategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({
  params,
}: AppsCategoryPageProps): Promise<Metadata> {
  if (IS_NATIVE_APP) return {};
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  return createPageMetadata({
    canonical: `/apps/category/${encodeURIComponent(decodedCategory)}`,
    description: `Игры в категории ${decodedCategory}.`,
    title: decodedCategory,
  });
}

export default async function AppsCategoryPage({
  params,
}: AppsCategoryPageProps) {
  if (IS_NATIVE_APP) return <AppAliasRedirect />;
  const { category } = await params;
  
  redirect(`/apps?category=${category}`);
}
