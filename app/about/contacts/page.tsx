import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import ContactsContent from './contacts-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Контакты',
  description: 'Свяжитесь с нами — поддержка, сотрудничество, вопросы.',
  keywords: ['контакты', 'поддержка', 'связь', 'помощь'],
  canonical: '/about/contacts',
});

export default function ContactsPage() {
  return <ContactsContent />;
}
