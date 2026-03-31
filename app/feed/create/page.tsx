import type { Metadata } from 'next';

import CreatePostContent from './create-content';

export const metadata: Metadata = {
  title: 'Новый пост',
  description: 'Создайте новое, такое красивое и прекрасное',
};

export default function CreatePostPage() {
  return <CreatePostContent />;
}
