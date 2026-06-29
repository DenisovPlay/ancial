'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/button';
import { Input } from '../components/form';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { checkAuth, isAuthenticated, lang } = useAuth();

  // Если пользователь уже авторизован - кидаем его на главную
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        localStorage.setItem('token', data.data?.token || '');
        
        // После получения токена заставляем контекст обновить данные о пользователе
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
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/50 rounded-3xl p-3 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">{lang?.authorization || 'Авторизация'}</h1>

        {/* Вывод ошибки */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="login">
              {lang?.login_field || 'Логин'}
            </label>
            <Input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={isLoading}
              placeholder={lang?.your_login || "Ваш логин"}
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="password">
              {lang?.password_field || 'Пароль'}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            fullWidth
            className="mt-2"
          >
            {isLoading ? (lang?.logging_in || 'Вход...') : (lang?.log_in || 'Войти')}
          </Button>
          
          <div className="text-center mt-4">
            <span className="text-zinc-400 text-sm">{lang?.no_account || 'Нет аккаунта? '}</span>
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              {lang?.register || 'Зарегистрироваться'}
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
