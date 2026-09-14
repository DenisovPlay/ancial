import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import EditPostContent from './edit-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Редактировать пост',
  description: 'Отредактируйте публикацию — исправьте текст, обновите фотографии или измените детали.',
  keywords: ['редактировать', 'изменить пост', 'редактирование'],
  canonical: '/feed/edit',
});

type EditPageProps = {
  searchParams: Promise<{
    from?: string | string[] | undefined;
    id?: string | string[] | undefined;
  }>;
};

export default async function EditPostPage({ searchParams }: EditPageProps) {
  const resolvedSearchParams = await searchParams;
  const postId = Array.isArray(resolvedSearchParams.id)
    ? (resolvedSearchParams.id[0] ?? null)
    : (resolvedSearchParams.id ?? null);
  const from = Array.isArray(resolvedSearchParams.from) ? resolvedSearchParams.from[0] : resolvedSearchParams.from;

  return <EditPostContent postId={postId} returnToPost={from === 'post'} />;
}
