import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import AccountContent from './account-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Аккаунт',
  description: 'Настройки аккаунта — измените имя, фото, информацию о себе.',
  keywords: ['аккаунт', 'профиль', 'настройки профиля'],
  canonical: '/settings/account',
});

export default function AccountSettingsPage() {
  return <AccountContent />;
}
