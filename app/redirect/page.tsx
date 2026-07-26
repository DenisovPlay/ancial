import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import RedirectContent from './redirect-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Переход по ссылке',
  description: 'Проверка безопасности ссылки перед переходом на сторонний ресурс.',
  canonical: '/redirect',
});

export default function RedirectPage() {
  return <RedirectContent />;
}
