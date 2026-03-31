import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import PublishSongContent from './publish-song-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Как опубликовать музыку',
  description: 'Руководство по публикации музыки в Ancial.',
  keywords: ['музыка', 'публикация', 'гайд', 'инструкция'],
  canonical: '/about/guides/publish-song',
});

export default function PublishSongPage() {
  return <PublishSongContent />;
}
