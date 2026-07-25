import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import LoginContent from './login-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Вход',
  description: 'Войдите в свой аккаунт Zypo для доступа к ленте, сообщениям и другим сервисам.',
  keywords: ['вход', 'авторизация', 'логин', 'аккаунт'],
  canonical: '/login',
});

export default function LoginPage() {
  return <LoginContent />;
}
