import type { Metadata } from 'next';
import { createPageMetadata } from '../../../seo';
import ContactsSecurityContent from './contacts-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Телефон и почта',
  description: 'Настройки безопасности — подтверждение и изменение контактных данных.',
  keywords: ['безопасность', 'телефон', 'почта', 'верификация', 'контакты'],
  canonical: '/settings/security/contacts',
});

export default function ContactsSecurityPage() {
  return <ContactsSecurityContent />;
}
