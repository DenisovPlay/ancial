import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import EmailVerifContent from './emailverif-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Подтверждение почты',
  description: 'Подтвердите адрес электронной почты в Zypo.',
  canonical: '/emailverif',
});

export default function EmailVerifPage() {
  return <EmailVerifContent />;
}
