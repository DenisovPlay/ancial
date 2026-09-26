import { SITE_URL, TELEGRAM_BOT_ID, YANDEX_CLIENT_ID } from '../config.ts';
import { OAUTH_CANCELLED } from './oauth-login.ts';

/**
 * Вход через Яндекс ID и Telegram в приложении (Capacitor).
 *
 * Попапов с postMessage в WebView нет, поэтому провайдер открывается в системном браузере, а возвращает
 * в приложение ссылка cc.zypo.app://oauth. Её может перехватить чужое приложение, так что секретов в ней
 * нет — схема как PKCE (бэкенд: modules/auth/app_oauth.php):
 *
 *   1. verifier — случайный секрет, остаётся в приложении; провайдеру уходит challenge = sha256(verifier).
 *   2. Страница возврата бэкенда сохраняет данные провайдера под challenge и открывает приложение.
 *   3. Приложение шлёт обычный вход/регистрацию с app_verifier — бэкенд находит данные и входит.
 */

export type NativeOAuthProvider = 'yandex' | 'telegram';

const RETURN_EVENT = 'zypo:native-oauth-return';
/** Сколько ждём возврата: человек может долго вводить пароль/подтверждать в Telegram. */
const RETURN_TIMEOUT_MS = 10 * 60 * 1000;
/** Браузер закрыли — ждём чуть-чуть: ссылка возврата может прийти сразу следом за закрытием. */
const BROWSER_CLOSED_GRACE_MS = 1500;

type ReturnDetail = { provider: string; state: string; status: string };

function randomBase64Url(bytes: number): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = '';
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Адрес провайдера, который вернёт на страницу бэкенда mode=app с нашими state и challenge. */
export function buildNativeOAuthUrl(provider: NativeOAuthProvider, state: string, challenge: string): string {
  const returnParams = new URLSearchParams({ mode: 'app', state, challenge }).toString();
  if (provider === 'yandex') {
    return `https://oauth.yandex.ru/authorize?${new URLSearchParams({
      response_type: 'token',
      client_id: YANDEX_CLIENT_ID,
      redirect_uri: `${SITE_URL}/api/V2/oauth/Yandex.php?${returnParams}`,
      state,
    })}`;
  }
  return `https://oauth.telegram.org/auth?${new URLSearchParams({
    bot_id: String(TELEGRAM_BOT_ID),
    origin: SITE_URL,
    request_access: 'write',
    return_to: `${SITE_URL}/api/V2/oauth/Telegram.php?${returnParams}`,
  })}`;
}

/**
 * Ссылка возврата cc.zypo.app://oauth?provider=…&state=…&status=… → событие для ожидающего входа.
 * true — это была ссылка входа (экран открывать не нужно).
 */
export function dispatchNativeOAuthReturn(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'cc.zypo.app:' || url.host !== 'oauth') return false;
  const detail: ReturnDetail = {
    provider: url.searchParams.get('provider') || '',
    state: url.searchParams.get('state') || '',
    status: url.searchParams.get('status') || '',
  };
  window.dispatchEvent(new CustomEvent<ReturnDetail>(RETURN_EVENT, { detail }));
  return true;
}

/**
 * Открывает провайдера в системном браузере и ждёт возврата. Результат — данные для
 * POST /api/V2/oauth/{Yandex|Telegram}.php (action login/signup): { app_verifier }.
 * Отмена (закрыли браузер, отказались у провайдера) — ошибка OAUTH_CANCELLED.
 */
export async function startNativeOAuth(provider: NativeOAuthProvider): Promise<Record<string, string>> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(16);
  const challenge = await sha256Hex(verifier);
  const { Browser } = await import('@capacitor/browser');

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let closedTimer = 0;
    let finishedHandle: { remove: () => Promise<void> } | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener(RETURN_EVENT, onReturn);
      window.clearTimeout(timeoutTimer);
      window.clearTimeout(closedTimer);
      void finishedHandle?.remove();
      fn();
    };

    const onReturn = (event: Event) => {
      const detail = (event as CustomEvent<ReturnDetail>).detail;
      if (!detail || detail.provider !== provider || detail.state !== state) return;
      if (detail.status === 'ok') finish(resolve);
      else finish(() => reject(new Error(detail.status === 'cancelled' ? OAUTH_CANCELLED : 'oauth_invalid')));
    };

    const timeoutTimer = window.setTimeout(() => finish(() => reject(new Error(OAUTH_CANCELLED))), RETURN_TIMEOUT_MS);
    window.addEventListener(RETURN_EVENT, onReturn);

    void Browser.addListener('browserFinished', () => {
      window.clearTimeout(closedTimer);
      closedTimer = window.setTimeout(() => finish(() => reject(new Error(OAUTH_CANCELLED))), BROWSER_CLOSED_GRACE_MS);
    }).then((handle) => {
      if (settled) void handle.remove();
      else finishedHandle = handle;
    });

    Browser.open({ url: buildNativeOAuthUrl(provider, state, challenge) })
      .catch((error: unknown) => finish(() => reject(error instanceof Error ? error : new Error('oauth_unavailable'))));
  });

  return { app_verifier: verifier };
}
