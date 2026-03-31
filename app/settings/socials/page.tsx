import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import SocialsContent from './socials-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Соцсети',
  description: 'Привязанные социальные сети — управляйте аккаунтами VK, Google, Telegram.',
  keywords: ['соцсети', 'VK', 'Google', 'Telegram', 'привязка'],
  canonical: '/settings/socials',
});

export default function SocialsSettingsPage() {
  return <SocialsContent />;
}
