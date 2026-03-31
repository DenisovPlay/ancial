import type { Metadata } from 'next';

import EditPostContent from './edit-content';

export const metadata: Metadata = {
  title: 'Изменить пост',
  description: 'Измените запись, сохраняя её красивой и аккуратной',
};

type EditPageProps = {
  searchParams: Promise<{
    id?: string | string[] | undefined;
  }>;
};

export default async function EditPostPage({ searchParams }: EditPageProps) {
  const resolvedSearchParams = await searchParams;
  const postId = Array.isArray(resolvedSearchParams.id)
    ? (resolvedSearchParams.id[0] ?? null)
    : (resolvedSearchParams.id ?? null);

  return <EditPostContent postId={postId} />;
}
