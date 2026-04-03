import type { Metadata } from 'next';

import MessagesContent from '../messages-content';
import { createPageMetadata } from '../../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Чаты',
  description: 'Приватное общение с друзьями и коллегами на Ancial.',
  keywords: ['чаты', 'сообщения', 'личные сообщения', 'диалоги'],
  canonical: '/messages',
});

export default function MessagesPage() {
  return <MessagesContent />;
}
