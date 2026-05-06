import type { Metadata } from 'next';

import { createPageMetadata } from '../../seo';
import AppsContent from '../apps-content';

type AppsSearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  canonical: '/apps/search',
  description: 'Поиск игр и веб-приложений в ZYNT.',
  title: 'Поиск ZYNT',
});

export default async function AppsSearchPage({
  searchParams,
}: AppsSearchPageProps) {
  const params = await searchParams;
  const queryValue = params.q;
  const query = Array.isArray(queryValue) ? queryValue[0] : queryValue;

  return <AppsContent initialQuery={query ?? ''} mode="search" />;
}
