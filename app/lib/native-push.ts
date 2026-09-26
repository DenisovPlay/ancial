import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Нативные push-уведомления приложения (FCM через @capacitor/push-notifications).
 *
 * Токен устройства кладётся в тот же `pushsid` профиля, что и web-push сайта: бэкенд шлёт одно
 * FCM-сообщение, у которого есть и блок webpush (сайт), и android.notification (приложение).
 * Канал `zypo_default` и иконка `ic_stat_zypo` должны совпадать с modules/notifications.php.
 *
 * Модуль грузится только в сборке приложения (динамический import за IS_NATIVE_APP).
 */

export const NATIVE_PUSH_CHANNEL_ID = 'zypo_default';

/** Токен, который это устройство последним отдало в pushsid, — чтобы обновлять только свою подписку. */
const STORED_TOKEN_KEY = 'native_push_token';
const REGISTER_TIMEOUT_MS = 15_000;

export const NATIVE_PUSH_PERMISSION_DENIED = 'push_permission_denied';

export function getStoredNativePushToken(): string {
  try {
    return localStorage.getItem(STORED_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function storeNativePushToken(token: string) {
  try {
    if (token) localStorage.setItem(STORED_TOKEN_KEY, token);
    else localStorage.removeItem(STORED_TOKEN_KEY);
  } catch {
    // хранилище недоступно — при следующем запуске токен просто не обновится сам
  }
}

/** Разрешение уже выдано (без запроса). */
export async function hasNativePushPermission(): Promise<boolean> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const status = await PushNotifications.checkPermissions();
  return status.receive === 'granted';
}

/**
 * Запрашивает разрешение (если нужно), создаёт канал и регистрирует устройство в FCM.
 * Возвращает FCM-токен. Отказ в разрешении — ошибка NATIVE_PUSH_PERMISSION_DENIED.
 */
export async function registerNativePush(channelName: string): Promise<string> {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let status = await PushNotifications.checkPermissions();
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
    status = await PushNotifications.requestPermissions();
  }
  if (status.receive !== 'granted') {
    throw new Error(NATIVE_PUSH_PERMISSION_DENIED);
  }

  // Android 8+: без канала уведомления в фоне не показываются. Повторное создание безопасно (обновляет имя).
  await PushNotifications.createChannel({
    id: NATIVE_PUSH_CHANNEL_ID,
    name: channelName,
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  }).catch((error: unknown) => console.error('Failed to create push channel', error));

  const handles: PluginListenerHandle[] = [];
  const token = await new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('push_register_timeout')), REGISTER_TIMEOUT_MS);
    const done = (fn: () => void) => {
      window.clearTimeout(timer);
      fn();
    };
    void Promise.all([
      PushNotifications.addListener('registration', ({ value }) => done(() => resolve(value))),
      PushNotifications.addListener('registrationError', ({ error }) => done(() => reject(new Error(error || 'push_register_failed')))),
    ]).then((added) => {
      handles.push(...added);
      return PushNotifications.register();
    }).catch((error: unknown) => done(() => reject(error instanceof Error ? error : new Error('push_register_failed'))));
  }).finally(() => {
    handles.forEach((handle) => void handle.remove());
  });

  storeNativePushToken(token);
  return token;
}

/** Отписка устройства от FCM (после того как pushsid на сервере сброшен). */
export async function unregisterNativePush(): Promise<void> {
  storeNativePushToken('');
  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.unregister().catch((error: unknown) => console.error('Failed to unregister push', error));
}
