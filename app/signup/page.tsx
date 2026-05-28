import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import SignupContent from './signup-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Регистрация',
  description: 'Создайте аккаунт Ancial для доступа к ленте, сообщениям и другим сервисам.',
  keywords: ['регистрация', 'создать аккаунт', 'signup', 'аккаунт'],
  canonical: '/signup',
});

export default function SignupPage() {
  return <SignupContent />;
}
