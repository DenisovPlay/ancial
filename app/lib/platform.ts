/**
 * Цель сборки. `NEXT_PUBLIC_BUILD_TARGET=app` — статический экспорт для Capacitor (Android/iOS):
 * HTML/JS внутри APK, данные — напрямую с бэкенда. Без флага — сайт, как всегда.
 *
 * Значение подставляется при сборке, поэтому ветки `if (IS_NATIVE_APP)` вырезаются из веб-бандла.
 */
export const IS_NATIVE_APP = process.env.NEXT_PUBLIC_BUILD_TARGET === 'app';

/** Приложение: мост медиасессии к нативному плагину установлен — плееру пора заново отдать метаданные трека. */
export const NATIVE_MEDIA_SESSION_READY_EVENT = 'zypo:native-media-session-ready';

/**
 * Запущено как установленное приложение: наша сборка (Capacitor) или PWA с экрана «Домой».
 * Только на клиенте: на сервере — false (для разметки, зависящей от этого, ждать монтирования).
 */
export function isInstalledApp(): boolean {
  if (IS_NATIVE_APP) return true;
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    // старый браузер — обычная вкладка
  }
  // Старый iOS Safari отмечает запуск с экрана «Домой» только так.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Платформа приложения (для X-App-Platform и AppConfig.php). На сайте — 'web'.
 * По user-agent, без импорта Capacitor: модуль используется и в node-тестах.
 */
export function getAppPlatform(): 'android' | 'ios' | 'web' {
  if (!IS_NATIVE_APP || typeof navigator === 'undefined') return 'web';
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'android';
}
