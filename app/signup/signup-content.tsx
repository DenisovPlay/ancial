'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { setAuthToken } from '../lib/cache-helpers';
import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';
import OAuthButtons from '../components/oauth-buttons';

export default function SignupContent() {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [password, setPassword] = useState('');
  const [password_2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hostname, setHostname] = useState('ancial.vercel.app');
  const router = useRouter();
  const { checkAuth, isAuthenticated, lang } = useAuth();

  useEffect(() => {
    // hostname доступен только на клиенте — сеттлер здесь источник правды (SSR не знает хост).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHostname(window.location.host);
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const completeSignup = async (token: string) => {
    setAuthToken(token);
    await checkAuth({ force: true });
    router.push('/');
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      const result = await AncialAPI.signupResponse({
        login,
        email,
        fname,
        lname,
        password,
        password_2,
      });

      if (!result.success) {
        setError(getApiMessage(result.error, lang, lang?.signup_error || 'Ошибка регистрации'));
        setIsLoading(false);
        return;
      }

      const loginResult = await AncialAPI.loginResponse<{ token?: string }>({ login, password });

      if (!loginResult.success) {
        router.push('/login');
      } else {
        setAuthToken(loginResult.data?.token || '');
        await checkAuth();
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError(lang?.server_connection_error || 'Ошибка соединения с сервером');
      setIsLoading(false);
    }
  };

  return (
    <main className="md:min-h-screen flex items-center justify-center">
      <div className="flex flex-col w-full md:w-fit">
        <div className="bg-purple-600/25 duration-300 text-purple-600 rounded-3xl rounded-b-none flex p-1 justify-center items-center pb-10 -mb-9 shadow">
          <span>
            <Icon name="IC-lock" className="w-5 h-5 inline fill-purple-600 mr-1" />
            <span>{lang?.checkdomain || 'Проверяйте домен'}</span>: <b>https://</b>{hostname}
          </span>
        </div>

        <div className="flex flex-col lg:grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-xl">
          <div className="bg-zinc-900 duration-300 flex flex-col lg:max-w-xs p-3 gap-3 shadow">
            <div className="flex flex-row gap-3 items-center">
              <AppImage width={64} height={64} className="w-16 h-16 rounded-2xl inline" src="/img/zypo/logo-rounded.webp" alt="Logo" />
              <span className="text-zinc-200 text-lg">{lang?.reghello || 'Создайте аккаунт'}</span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Icon name="IC-socials" className="w-8 h-8 fill-white" />
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea1 || 'Безопасная авторизация'}</span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Icon name="IC-login" className="w-8 h-8 fill-white" />
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea2 || 'Быстрый доступ'}</span>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Icon name="IC-lock" className="w-8 h-8 fill-white" />
                </div>
                <span className="text-zinc-400 text-sm">{lang?.logfea3 || 'Защита данных'}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 text-center">
              <span className="text-zinc-400 text-sm">{lang?.already_have_account || 'Уже есть аккаунт? '}</span>
              <Link href="/login" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                {lang?.log_in || 'Войти'}
              </Link>
            </div>
          </div>

          <div className="bg-zinc-800 duration-300 flex flex-col gap-3 p-3 lg:max-w-xs justify-center items-center shadow">
            <span className="text-zinc-200 text-lg font-bold w-full">{lang?.regcitata || 'Присоединяйся к нам'}</span>

            <form onSubmit={handleRegister} className="flex flex-col gap-3 justify-center items-center w-full">
              <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                <input
                  autoComplete="username"
                  placeholder={lang?.username || "Имя пользователя"}
                  type="text"
                  maxLength={63}
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={isLoading}
                  className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                  required
                />
              </div>

              <span className="text-zinc-400 text-sm -my-1.5 w-full">{lang?.regname || 'Как вас зовут?'}</span>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
                    autoComplete="given-name"
                    placeholder={lang?.name || "Имя"}
                    maxLength={31}
                    type="text"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                  />
                </div>
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
                    autoComplete="family-name"
                    placeholder={lang?.lname || "Фамилия"}
                    maxLength={31}
                    type="text"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                  />
                </div>
              </div>

              <span className="text-zinc-400 text-sm -my-1.5 w-full">{lang?.regcont || 'Контактные данные'}</span>

              <div className="flex w-full">
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
                    autoComplete="email"
                    placeholder={lang?.email || "E-mail"}
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                    required
                  />
                </div>
              </div>

              <span className="text-zinc-400 text-sm -my-1.5 w-full">{lang?.regpass || 'Придумайте пароль'}</span>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
                    autoComplete="new-password"
                    placeholder={lang?.password || "Пароль"}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                    required
                  />
                </div>
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30 relative">
                  <input
                    autoComplete="new-password"
                    placeholder={lang?.passwordrep || "Повторите пароль"}
                    type={showPassword ? "text" : "password"}
                    value={password_2}
                    onChange={(e) => setPassword2(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 pr-10 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                    required
                  />
                  <span
                    className="absolute right-0 cursor-pointer w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 duration-300 active:scale-95 rounded-3xl text-zinc-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Icon name={showPassword ? "IC-auth-eye-off" : "IC-auth-eye"} className="w-6 h-6 fill-white" />
                  </span>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/25 text-red-500 shadow rounded-3xl w-full border border-zinc-600/30 mt-1">
                  <div className="flex items-center w-full gap-3">
                    <Icon name="IC-info-circle" fill="none" className="w-6 h-6 shrink-0 stroke-current" />
                    <label className="text-sm lg:text-base w-full break-words">{error}</label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-bold uppercase cursor-pointer text-white mt-1"
              >
                {isLoading ? (
                  <Icon name="IC-loader" className="w-6 h-6 inline animate-spin fill-white" />
                ) : (
                  lang?.signup || 'Зарегистрироваться'
                )}
              </button>

              <OAuthButtons
                action="signup"
                disabled={isLoading}
                onToken={(token) => void completeSignup(token)}
                onChallenge={() => router.push('/login')}
                onError={setError}
              />
            </form>
          </div>
        </div>
        <div className="lg:hidden"><br /><br /><br /></div>
      </div>
    </main>
  );
}
