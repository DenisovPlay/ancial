import { Suspense } from 'react';
import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import EditPostContent from './edit-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Редактировать пост',
  description: 'Отредактируйте публикацию — исправьте текст, обновите фотографии или измените детали.',
  keywords: ['редактировать', 'изменить пост', 'редактирование'],
  canonical: '/feed/edit',
});

export default function EditPostPage() {
  return (
    <Suspense fallback={null}>
      <EditPostContent />
    </Suspense>
  );
}
