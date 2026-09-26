import type { Metadata } from 'next';

import SinglePostContent from './post-content';
import { createPageMetadata } from '../../../seo';
import { AppRouteShell } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';
import { IS_NATIVE_APP } from '../../../lib/platform';

// Приложение: одна страница-заготовка, реальный id берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ id: 'param' });

type SinglePostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: SinglePostPageProps): Promise<Metadata> {
  // Приложение: SEO не нужен, а сборка не должна ходить в сеть.
  if (IS_NATIVE_APP) return {};
  const { id } = await params;

  return createPageMetadata({
    canonical: `/feed/post/${encodeURIComponent(id)}`,
    description: 'Запись из ленты Zypo.',
    openGraph: {
      type: 'article',
    },
    title: 'Пост',
  });
}

export default async function SinglePostPage({ params }: SinglePostPageProps) {
  const { id } = await params;

  return IS_NATIVE_APP ? (
    <AppRouteShell param="id" prop="postId">
      <SinglePostContent postId={id} />
    </AppRouteShell>
  ) : <SinglePostContent postId={id} />;
}
