import type { Metadata } from 'next';
import { createPageMetadata } from '../seo';
import SettingsContent from './settings-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Настройки',
  description: 'Настройте свой аккаунт — измените язык, пароль, параметры конфиденциальности.',
  keywords: ['настройки', 'параметры', 'конфигурация'],
  canonical: '/settings',
});

export default function SettingsPage() {
  return <SettingsContent />;
}
