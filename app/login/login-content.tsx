'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { cache } from '../lib/cache.ts';
import { Button } from '../components/button';
import { Input } from '../components/form';

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

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    setHostname(window.location.host);
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
      const params = new URLSearchParams();
      params.append('do_login', 'True');
      params.append('login', login);
      params.append('password', password);

      const res = await fetch(`/api/V2/auth/Login.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || (lang?.login_error || 'Ошибка авторизации'));
      } else {
        cache.set('token', data.data?.token || '', { category: 'profile' });
        await checkAuth();
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError(lang?.server_connection_error || 'Ошибка соединения с сервером');
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
              <img className="w-16 h-16 rounded-2xl inline" src="/includes/img/401anlogo.png" alt="Logo" />
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

            <div className="mt-auto pt-4 text-center">
              <span className="text-zinc-400 text-sm">{lang?.no_account || 'Нет аккаунта? '}</span>
              <Link href="/signup" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                {lang?.register || 'Зарегистрироваться'}
              </Link>
            </div>
          </div>

          <div className="bg-zinc-800 duration-300 flex flex-col gap-3 p-3 lg:max-w-xs justify-center items-center shadow">
            <span className="text-zinc-200 text-lg font-bold w-full">
              <span dangerouslySetInnerHTML={{ __html: greeting.text }}></span>
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

            <form onSubmit={handleLogin} className="flex flex-col gap-3 justify-center items-center w-full">
              <div className="flex items-center bg-zinc-900 rounded-3xl rounded-b-none border-t border-x border-zinc-600/30 w-full shadow">
                <input
                  placeholder={lang?.username || "Имя пользователя"}
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
            </form>
          </div>
        </div>
        <div className="lg:hidden"><br /><br /><br /></div>
      </div>
    </main>
  );
}
