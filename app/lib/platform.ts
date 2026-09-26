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
 * Платформа приложения (для X-App-Platform и AppConfig.php). На сайте — 'web'.
 * По user-agent, без импорта Capacitor: модуль используется и в node-тестах.
 */
export function getAppPlatform(): 'android' | 'ios' | 'web' {
  if (!IS_NATIVE_APP || typeof navigator === 'undefined') return 'web';
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : 'android';
}
