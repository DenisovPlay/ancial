'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { cache } from '../lib/cache.ts';

export default function SignupContent() {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password_2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hostname, setHostname] = useState('ancial.vercel.app');
  const router = useRouter();
  const { checkAuth, isAuthenticated, lang } = useAuth();

  useEffect(() => {
    setHostname(window.location.host);
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('do_signup', 'True');
      params.append('login', login);
      params.append('email', email);
      params.append('fname', fname);
      params.append('lname', lname);
      params.append('phone', phone);
      params.append('password', password);
      params.append('password_2', password_2);

      const res = await fetch(`/api/V2/auth/SignUp.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || (lang?.signup_error || 'Ошибка регистрации'));
        setIsLoading(false);
        return;
      }

      const loginParams = new URLSearchParams();
      loginParams.append('do_login', 'True');
      loginParams.append('login', login);
      loginParams.append('password', password);

      const loginRes = await fetch(`/api/V2/auth/Login.php`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginParams.toString(),
      });

      const loginData = await loginRes.json();

      if (!loginData.success) {
        router.push('/login');
      } else {
        cache.set('token', loginData.data?.token || '', { category: 'profile' });
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
              <span className="text-zinc-200 text-lg">{lang?.reghello || 'Создайте аккаунт'}</span>
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
                  autoComplete="off"
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

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
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
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
                    placeholder={lang?.phone || "Телефон"}
                    type="tel"
                    maxLength={12}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-transparent w-full grow focus:ring-0 focus:outline-0 focus:border-0 placeholder-zinc-600 rounded-3xl"
                  />
                </div>
              </div>

              <span className="text-zinc-400 text-sm -my-1.5 w-full">{lang?.regpass || 'Придумайте пароль'}</span>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center bg-zinc-900 rounded-3xl w-full shadow border border-zinc-600/30">
                  <input
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
                    <svg className="w-6 h-6 fill-white" viewBox="0 0 48 48">
                      <use href={showPassword ? "#IC-auth-eye-off" : "#IC-auth-eye"}></use>
                    </svg>
                  </span>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/25 text-red-500 shadow rounded-3xl w-full border border-zinc-600/30 mt-1">
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
                className="w-full rounded-3xl border border-zinc-600/30 shadow flex items-center justify-center bg-purple-500 hover:bg-purple-600 active:scale-95 disabled:opacity-50 duration-300 px-3 py-2 font-bold uppercase cursor-pointer text-white mt-1"
              >
                {isLoading ? (
                  <svg className="w-6 h-6 inline animate-spin fill-white" viewBox="0 0 48 48">
                    <use href="#IC-auth-loader"></use>
                  </svg>
                ) : (
                  lang?.signup || 'Зарегистрироваться'
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
