import type { Metadata } from 'next';

import SinglePostContent from './post-content';
import { createPageMetadata } from '../../../seo';

type SinglePostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: SinglePostPageProps): Promise<Metadata> {
  const { id } = await params;

  return createPageMetadata({
    canonical: `/feed/post/${encodeURIComponent(id)}`,
    description: 'Запись из ленты Ancial.',
    openGraph: {
      type: 'article',
    },
    title: 'Пост',
  });
}

export default async function SinglePostPage({ params }: SinglePostPageProps) {
  const { id } = await params;

  return <SinglePostContent postId={id} />;
}
