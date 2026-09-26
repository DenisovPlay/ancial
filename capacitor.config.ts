import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Приложение Zypo (Capacitor). Веб-часть — статический экспорт Next (`npm run build:app` → out/),
 * лежит внутри APK. server.url не задаём: RuStore не принимает обёртки над сайтом.
 * Сеть — обычный fetch + CORS на бэкенде (CapacitorHttp выключен).
 */
const config: CapacitorConfig = {
  appId: 'cc.zypo.app',
  appName: 'Zypo',
  webDir: 'out',
  backgroundColor: '#000000',
  android: {
    // Схема https://localhost — её Origin разрешён в CORS бэкенда.
    // Отладка WebView (chrome://inspect) — только в debug-сборке.
    webContentsDebuggingEnabled: process.env.CAP_ANDROID_RELEASE !== '1',
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    SystemBars: {
      // Сборка приложения ставит viewport-fit=contain: Capacitor держит WebView внутри безопасной зоны
      // на любой версии WebView — фиксированные элементы сайта (док, плееры, шторки, тосты) не уходят
      // под статусбар и жестовую панель. Под панелями — чёрный фон окна (backgroundColor).
      insetsHandling: 'native',
      initialViewportFitValueHint: 'contain',
      style: 'DARK',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 600,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    Keyboard: {
      // Размер WebView меняется под клавиатуру — поле ввода чата не уходит под неё.
      resize: 'native',
    },
  },
};

export default config;
