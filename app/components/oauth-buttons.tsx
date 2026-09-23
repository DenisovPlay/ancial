'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '../context/AuthContext';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { OAUTH_CANCELLED, OAUTH_POPUP_BLOCKED, preloadTelegramLogin, telegramLogin, yandexLogin } from '../lib/oauth-login';
import { useUserCountry } from '../lib/user-geo';
import AppImage from './app-image';
import Icon from './svg-icon';

type Provider = 'yandex' | 'telegram';

type OAuthButtonsProps = {
  /** login — только вход в привязанный аккаунт; signup — создать аккаунт (или войти, если уже привязан). */
  action: 'login' | 'signup';
  disabled?: boolean;
  onToken: (token: string) => void;
  onChallenge: (challenge: string) => void;
  onError: (message: string) => void;
};

const subscribeNothing = () => () => {};

const BUTTON_CLASS = 'flex-1 min-w-0 rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-medium cursor-pointer text-zinc-200';

/** Вход и регистрация через Яндекс ID и Telegram. Telegram — только вне России. */
export default function OAuthButtons({ action, disabled, onToken, onChallenge, onError }: OAuthButtonsProps) {
  const { lang } = useAuth();
  const country = useUserCountry();
  // Страна читается из кэша только в браузере — до гидратации кнопку Telegram не показываем.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const showTelegram = isClient && country !== 'RU';
  const [busy, setBusy] = useState<Provider | null>(null);

  useEffect(() => {
    if (showTelegram) void preloadTelegramLogin().catch(() => {});
  }, [showTelegram]);

  const run = async (provider: Provider, getPayload: () => Promise<Record<string, string>>) => {
    setBusy(provider);
    try {
      const payload = await getPayload();
      const result = await AncialAPI.oauthLoginResponse(provider, action, payload);
      if (!result.success) {
        onError(getApiMessage(result.error, lang, lang?.login_error || 'Ошибка авторизации'));
      } else if (result.data?.requires_second_factor && result.data.challenge) {
        onChallenge(result.data.challenge);
      } else if (result.data?.token) {
        onToken(result.data.token);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === OAUTH_CANCELLED) return;
      onError(code === OAUTH_POPUP_BLOCKED
        ? (lang?.oauth_popup_blocked || 'Браузер заблокировал окно входа — разрешите всплывающие окна')
        : getApiMessage(code, lang, lang?.server_connection_error || 'Ошибка соединения с сервером'));
    } finally {
      setBusy(null);
    }
  };

  // Окна провайдеров открываются синхронно внутри клика — иначе их блокирует браузер.
  const handleYandex = () => {
    const tokenPromise = yandexLogin();
    void run('yandex', async () => ({ access_token: await tokenPromise }));
  };

  const handleTelegram = () => {
    const authPromise = telegramLogin();
    void run('telegram', async () => {
      const data = await authPromise;
      return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
    });
  };

  const isDisabled = disabled || busy !== null;

  return (
    <div className="flex w-full gap-3">
      <button type="button" onClick={handleYandex} disabled={isDisabled} className={BUTTON_CLASS}>
        {busy === 'yandex' ? (
          <Icon name="IC-loader" className="w-5 h-5 animate-spin fill-current" />
        ) : (
          <AppImage src="/img/socials/yandexlogo.png" alt="" width={20} height={20} className="w-5 h-5 rounded-full shrink-0" />
        )}
        <span className="truncate">{lang?.oauth_yandex || 'Яндекс ID'}</span>
      </button>
      {showTelegram ? (
        <button type="button" onClick={handleTelegram} disabled={isDisabled} className={BUTTON_CLASS}>
          {busy === 'telegram' ? (
            <Icon name="IC-loader" className="w-5 h-5 animate-spin fill-current" />
          ) : (
            <AppImage src="/img/socials/tg.png" alt="" width={20} height={20} className="w-5 h-5 shrink-0" />
          )}
          <span className="truncate">Telegram</span>
        </button>
      ) : null}
    </div>
  );
}
