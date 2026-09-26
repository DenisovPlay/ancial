import { SITE_URL, TELEGRAM_BOT_ID, YANDEX_CLIENT_ID } from '../config.ts';
import { loadScript } from './load-script.ts';

/** Подписанные данные Telegram Login — отправляются на бэкенд как есть, он проверяет подпись. */
export type TelegramAuthData = Record<string, string | number>;

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        auth: (options: { bot_id: number; request_access?: string }, callback: (data: TelegramAuthData | false) => void) => void;
      };
    };
  }
}

const TELEGRAM_WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';

/** Ошибки, после которых молча возвращаемся к форме (пользователь сам закрыл окно). */
export const OAUTH_CANCELLED = 'oauth_cancelled';
export const OAUTH_POPUP_BLOCKED = 'oauth_popup_blocked';

/** Заранее грузим виджет Telegram: auth() должен вызываться прямо в клике, иначе попап заблокируют. */
export function preloadTelegramLogin(): Promise<void> {
  return loadScript(TELEGRAM_WIDGET_SRC);
}

export function telegramLogin(): Promise<TelegramAuthData> {
  return new Promise((resolve, reject) => {
    const login = window.Telegram?.Login;
    if (!login) {
      reject(new Error('oauth_unavailable'));
      return;
    }
    login.auth({ bot_id: TELEGRAM_BOT_ID, request_access: 'write' }, (data) => {
      if (data) resolve(data);
      else reject(new Error(OAUTH_CANCELLED));
    });
  });
}

/**
 * Попап Яндекс ID (implicit flow). Окно открывается синхронно — вызывать прямо в обработчике клика.
 * Токен возвращает страница-попап бэкенда через postMessage; state защищает от подсунутого ответа.
 */
export function yandexLogin(): Promise<string> {
  const state = crypto.randomUUID();
  const redirectUri = `${SITE_URL}/api/V2/oauth/Yandex.php?mode=popup&origin=${encodeURIComponent(window.location.origin)}`;
  const url = `https://oauth.yandex.ru/authorize?${new URLSearchParams({
    response_type: 'token',
    client_id: YANDEX_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  })}`;
  const popup = window.open(url, 'yandex_oauth', 'width=520,height=720');

  return new Promise((resolve, reject) => {
    if (!popup) {
      reject(new Error(OAUTH_POPUP_BLOCKED));
      return;
    }
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(closedTimer);
      fn();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; access_token?: string; state?: string; error?: string } | null;
      if (event.origin !== SITE_URL || data?.type !== 'yandex_oauth' || data.state !== state) return;
      finish(() => (data.access_token ? resolve(data.access_token) : reject(new Error(data.error ? OAUTH_CANCELLED : 'oauth_invalid'))));
    };
    // Окно закрыли без ответа — считаем отменой (небольшая пауза: сообщение может прийти следом за закрытием).
    const closedTimer = window.setInterval(() => {
      if (popup.closed) window.setTimeout(() => finish(() => reject(new Error(OAUTH_CANCELLED))), 500);
    }, 500);
    window.addEventListener('message', onMessage);
  });
}

/**
 * Передача 2FA-challenge со страницы регистрации на страницу входа: шаг ввода кода живёт там.
 * sessionStorage, а не адрес — challenge не должен оседать в истории и логах. Живёт 5 минут, как сам challenge.
 */
const PENDING_CHALLENGE_KEY = 'pending_2fa_challenge';
const PENDING_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function stashPendingChallenge(challenge: string): void {
  try {
    sessionStorage.setItem(PENDING_CHALLENGE_KEY, JSON.stringify({ challenge, at: Date.now() }));
  } catch {
    // приватный режим / запрет хранилища — человек просто войдёт заново
  }
}

/** Забирает challenge один раз (и сразу удаляет); просроченный — игнорирует. */
export function takePendingChallenge(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHALLENGE_KEY);
    sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
    if (!raw) return null;
    const { challenge, at } = JSON.parse(raw) as { challenge?: string; at?: number };
    return challenge && at && Date.now() - at < PENDING_CHALLENGE_TTL_MS ? challenge : null;
  } catch {
    return null;
  }
}
