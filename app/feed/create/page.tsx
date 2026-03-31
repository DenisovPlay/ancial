import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import CreatePostContent from './create-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Новый пост',
  description: 'Создайте новую публикацию — поделитесь мыслями, фотографиями или новостями.',
  keywords: ['создать пост', 'новая публикация', 'написать'],
  canonical: '/feed/create',
});

export default function CreatePostPage() {
  return <CreatePostContent />;
}
