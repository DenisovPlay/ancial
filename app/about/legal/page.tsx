import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import LegalContent from './legal-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Документы',
  description: 'Юридические документы — пользовательское соглашение, политика конфиденциальности.',
  keywords: ['документы', 'соглашение', 'конфиденциальность', 'правила'],
  canonical: '/about/legal',
});

export default function LegalPage() {
  return <LegalContent />;
}
