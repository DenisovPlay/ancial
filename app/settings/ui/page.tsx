import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import UiSettingsContent from './ui-settings-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Интерфейс',
  description: 'Настройки интерфейса — язык отображения и визуальные эффекты стекла.',
  keywords: ['интерфейс', 'язык', 'эффекты стекла', 'тема', 'внешний вид', 'UI'],
  canonical: '/settings/ui',
});

export default function UiSettingsPage() {
  return <UiSettingsContent />;
}
