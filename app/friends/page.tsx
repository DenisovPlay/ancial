import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import FriendsContent from './friends-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Друзья',
  description: 'Управляйте списком друзей — добавляйте новых, принимайте заявки, общайтесь.',
  keywords: ['друзья', 'контакты', 'список друзей', 'заявки'],
  canonical: '/friends',
});

export default function FriendsPage() {
  return <FriendsContent />;
}
