import { IS_NATIVE_APP } from './platform';

/**
 * Открыть внешний адрес. Сайт — новая вкладка. Приложение — системный браузер (Custom Tabs):
 * window.open в WebView новых окон не создаёт.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!IS_NATIVE_APP) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
}
