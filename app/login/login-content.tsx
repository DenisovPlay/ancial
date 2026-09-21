'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { setAuthToken } from '../lib/cache-helpers';
import { getPasskey, isPasskeySupported } from '../lib/webauthn';
import { OtpInput } from '../components/otp-input';
import { sanitizeUserHtml } from '../lib/sanitize-html';

const greetings = [
  { text: 'Ну, удачной дороги тебе, сталкер!', author: 'Сидорович', source: 'S.T.A.L.K.E.R.' },
  { text: 'У нас никогда не будет второго шанса произвести первое впечатление.', author: 'Хлоя Прайс', source: 'Life Is Strange: Before the Storm' },
  { text: 'Добро пожаловать!', author: null, source: null },
  { text: 'А в чём сила, брат?', author: null, source: 'Брат 2' },
  { text: 'Хотите гарантий — купите тостер!', author: 'Ричард Моррисон', source: 'Crysis' },
  { text: 'Хочешь ходить по воде — научись сначала плавать', author: 'Таллис', source: 'Dragon Age 2' },
  { text: 'Неудача — возможность узнать что-то новое', author: null, source: 'The Elder Scrolls IV: Oblivion' },
  { text: 'Пусть бьёт меня сколько хочет, я тебя не брошу.', author: 'Шон Диаз', source: 'Life Is Strange 2' },
  { text: 'Иногда люди нуждаются в тебе. Даже если они это не признают.', author: 'Уильям Прайс', source: 'Life Is Strange: Before the Storm' },
  { text: 'Птицам так повезло, если что, они всегда могут улететь.', author: 'Максин Колфилд', source: 'Life Is Strange' },
  { text: 'Месть — забава для недоумков.', author: 'Артур Морган', source: 'Red Dead Redemption 2' },
  { text: '— Что есть музыка жизни?<br>— Тишина, брат мой.', author: null, source: 'The Elder Scrolls V: Skyrim' },
  { text: 'Ребят, нож выпал! Я не вру, нож!', author: 'Илья Мазеллов', source: 'Twitch' },
  { text: '#ТАЩИ', author: 'Илья Мазеллов', source: 'Twitch' }
];

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hostname, setHostname] = useState('ancial.vercel.app');
  const router = useRouter();
  const { checkAuth, isAuthenticated, lang } = useAuth();
  const [greeting, setGreeting] = useState(greetings[0]);
  // Второй фактор: если сервер вернул requires_second_factor, показываем ввод кода.
  const [twofaChallenge, setTwofaChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    // Случайное приветствие и hostname доступны только на клиенте — сеттлеры здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    setHostname(window.location.host);
    setPasskeySupported(isPasskeySupported());
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!login || !password) return;

    setError(null);
    setIsLoading(true);

    try {
      const result = await AncialAPI.loginResponse<{ token?: string; requires_second_factor?: string; challenge?: string }>({ login, password });

      if (!result.success) {
        setError(getApiMessage(result.error, lang, lang?.login_error || 'Ошибка авторизации'));
      } else if (result.data?.requires_second_factor && result.data?.challenge) {
        // Пароль верный, но нужен второй фактор — переключаемся на ввод кода.
        setTwofaChallenge(result.data.challenge);
        setCode('');
        setUseRecovery(false);
      } else {
        setAuthToken(result.data?.token || '');
        await checkAuth({ force: true });
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError(lang?.server_connection_error || 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const useCode = codeOverride ?? code;
    if (!twofaChallenge || !useCode) return;

    setError(null);
    setIsLoading(true);
    try {
      const result = await AncialAPI.twoFactorVerifyLoginResponse<{ token?: string }>(twofaChallenge, useCode, useRecovery);
      if (!result.success) {
        setError(getApiMessage(result.error, lang, lang?.twofa_wrong_code || 'Неверный код'));
      } else {
        setAuthToken(result.data?.token || '');
        await checkAuth({ force: true });
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError(lang?.server_connection_error || 'Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const options = await AncialAPI.passkeyAuthenticationOptions();
      const assertion = await getPasskey(options);
      const result = await AncialAPI.passkeyAuthenticationVerifyResponse<{ token?: string }>(assertion);
      if (!result.success) {
        setError(getApiMessage(result.error, lang, lang?.passkey_login_error || 'Не удалось войти по passkey'));
      } else {
        setAuthToken(result.data?.token || '');
        await checkAuth({ force: true });
        router.push('/');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        // пользователь отменил — молча
      } else {
        console.error(err);
        setError(lang?.passkey_login_error || 'Не удалось войти по passkey');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="md:min-h-screen flex items-center justify-center">
      <div className="flex flex-col w-full md:w-fit">
        <div className="bg-purple-600/25 duration-300 text-purple-600 rounded-3xl rounded-b-none flex p-1 justify-center items-center pb-10 -mb-9 shadow">
          <span>
            <svg className="w-5 h-5 inline fill-purple-600 mr-1" viewBox="0 0 48 48">
              <use href="#IC-lock"></use>
            </svg>
            <span>{lang?.checkdomain || 'Проверяйте домен'}</span>: <b>https://</b>{hostname}
          </span>
        </div>

        <div className="flex flex-col lg:grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-zinc-900 duration-300 flex flex-col lg:max-w-xs p-3 gap-3 shadow">
            <div className="flex flex-row gap-3 items-center">
              <img className="w-16 h-16 rounded-2xl inline" src="/img/zypo/logo-rounded.webp" alt="Logo" />
              <span className="text-zinc-200 text-lg">{lang?.loghello || 'Привет, добро пожаловать!'}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-feature-1"></use>
                  </svg>
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea1 || 'Безопасная авторизация'}</span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-feature-2"></use>
                  </svg>
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea2 || 'Быстрый доступ'}</span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-feature-3"></use>
                  </svg>
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea3 || 'Защита данных'}</span>
              </div>
            </div>

            {!twofaChallenge && (
              <div className="mt-auto pt-4 text-center">
                <span className="text-zinc-400 text-sm">{lang?.no_account || 'Нет аккаунта? '}</span>
                <Link href="/signup" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                  {lang?.register || 'Зарегистрироваться'}
                </Link>
              </div>
            )}
          </div>

          <div className="bg-zinc-800 duration-300 flex flex-col gap-3 p-3 lg:max-w-xs justify-center items-center shadow">
            {/* На шаге ввода кода 2FA цитата не нужна — прячем, как и поля логина. */}
            {!twofaChallenge && (
              <span className="text-zinc-200 text-lg font-bold w-full">
                {/* Тексты статические (в массиве выше), но одна цитата содержит <br> —
                    рендерим через санитайзер, чтобы разметка работала, а не показывалась текстом */}
                <span dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(greeting.text) }}></span>
                {(greeting.author || greeting.source) && (
                  <>
                    <br />
                    <span className={`text-zinc-300 text-xs ${greeting.author ? 'font-normal' : 'font-bold'}`}>
                      {greeting.author && <span>{greeting.author} - </span>}
                      {greeting.source && <span className="font-bold">{greeting.source}</span>}
                    </span>
                  </>
                )}
              </span>
            )}

            {twofaChallenge ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-3 justify-center items-center w-full">
              <div className="w-full flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => { setTwofaChallenge(null); setCode(''); setUseRecovery(false); setError(null); }}
                  className="flex items-center gap-1.5 text-zinc-200 text-lg font-bold hover:text-white duration-300 active:scale-95 cursor-pointer w-fit"
                >
                  <svg className="w-6 h-6 fill-current shrink-0" viewBox="0 0 48 48">
                    <use href="#IC-chevron-left"></use>
                  </svg>
                  {lang?.twofa_login_title || 'Подтверждение входа'}
                </button>
                <span className="text-zinc-400 text-sm">
                  {useRecovery
                    ? (lang?.twofa_enter_recovery || 'Введите резервный код')
                    : (lang?.twofa_enter_code || 'Введите код из приложения-аутентификатора')}
                </span>
              </div>
              {useRecovery ? (
                <div className="flex items-center bg-zinc-900 rounded-3xl border border-zinc-600/30 w-full shadow">
                  <input
                    placeholder={lang?.twofa_recovery_placeholder || 'xxxx-xxxx'}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full flex-grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl tracking-widest text-center"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={(full) => { setCode(full); void handleVerify(undefined, full); }}
                  disabled={isLoading}
                  autoFocus
                  bgClass="bg-zinc-900"
                  ariaLabel={lang?.twofa_code_placeholder || 'Код'}
                />
              )}

              {error && (
                <div className="px-3 py-2 bg-red-500/25 text-red-500 shadow rounded-3xl w-full border border-zinc-600/30">
                  <div className="flex items-center w-full gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 shrink-0 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <label className="text-sm lg:text-base w-full break-words">{error}</label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-bold uppercase cursor-pointer text-white"
              >
                {isLoading ? (
                  <svg className="w-6 h-6 inline animate-spin fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-loader"></use>
                  </svg>
                ) : (
                  lang?.twofa_confirm || 'Подтвердить'
                )}
              </button>

              <button
                type="button"
                onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(null); }}
                className="text-purple-400 hover:text-purple-300 text-sm cursor-pointer duration-300 active:scale-95"
              >
                {useRecovery
                  ? (lang?.twofa_use_code || 'Использовать код из приложения')
                  : (lang?.twofa_use_recovery || 'Использовать резервный код')}
              </button>
            </form>
            ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-3 justify-center items-center w-full">
              <div className="flex items-center bg-zinc-900 rounded-3xl rounded-b-none border-t border-x border-zinc-600/30 w-full shadow">
                <input
                  placeholder={lang?.login_or_email_phone || "Логин, почта или телефон"}
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={isLoading}
                  className="px-3 py-2 bg-transparent w-full flex-grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl rounded-b-none"
                  required
                />
              </div>

              <div className="-mt-3 flex items-center bg-zinc-900 rounded-3xl rounded-t-none border-t border-b border-x border-zinc-600/30 w-full shadow pr-1">
                <input
                  placeholder={lang?.password || "Пароль"}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="px-3 py-2 bg-transparent w-full flex-grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl rounded-t-none"
                  required
                />
                <span
                  className="cursor-pointer shrink-0 inset-y-0 w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 duration-300 active:scale-95 rounded-3xl text-zinc-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg className="w-6 h-6 fill-white" viewBox="0 0 48 48">
                    <use href={showPassword ? "#IC-auth-eye-off" : "#IC-auth-eye"}></use>
                  </svg>
                </span>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/25 text-red-500 shadow rounded-3xl w-full border border-zinc-600/30">
                  <div className="flex items-center w-full gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-6 h-6 shrink-0 stroke-current">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <label className="text-sm lg:text-base w-full break-words">{error}</label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-bold uppercase cursor-pointer text-white"
              >
                {isLoading ? (
                  <svg className="w-6 h-6 inline animate-spin fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-loader"></use>
                  </svg>
                ) : (
                  lang?.login || 'Войти'
                )}
              </button>

              {passkeySupported ? (
                <button
                  type="button"
                  onClick={() => void handlePasskeyLogin()}
                  disabled={isLoading}
                  className="w-full rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-medium cursor-pointer text-zinc-200"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 48 48">
                    <use href="#IC-lock"></use>
                  </svg>
                  {lang?.passkey_login || 'Войти по passkey'}
                </button>
              ) : null}
            </form>
            )}
          </div>
        </div>
        <div className="lg:hidden"><br /><br /><br /></div>
      </div>
    </main>
  );
}
