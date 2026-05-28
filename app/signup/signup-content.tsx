'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/button';
import { Input } from '../components/form';

export default function SignupContent() {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password_2, setPassword2] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { checkAuth, isAuthenticated } = useAuth();

  // Если пользователь уже авторизован - кидаем его на главную
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        setError(data.error || 'Ошибка регистрации');
        setIsLoading(false);
        return;
      }
      
      // Регистрация успешна, теперь логинимся чтобы получить токен
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
        // Если логин не удался, отправляем на страницу логина
        router.push('/login');
      } else {
        localStorage.setItem('token', loginData.data?.token || '');
        await checkAuth();
        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка соединения с сервером');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-3xl p-5 shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Регистрация</h1>

        {/* Вывод ошибки */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="login">
              Логин (только англ. буквы и цифры)
            </label>
            <Input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={isLoading}
              placeholder="username123"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="example@mail.com"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="fname">
                Имя
              </label>
              <Input
                id="fname"
                type="text"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                disabled={isLoading}
                placeholder="Иван"
              />
            </div>
            
            <div>
              <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="lname">
                Фамилия
              </label>
              <Input
                id="lname"
                type="text"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
                disabled={isLoading}
                placeholder="Иванов"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="phone">
              Номер телефона (опционально)
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              placeholder="+7 (999) 000-00-00"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="password">
              Пароль
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
          
          <div>
            <label className="block text-zinc-400 text-sm mb-1 ml-1" htmlFor="password_2">
              Повторите пароль
            </label>
            <Input
              id="password_2"
              type="password"
              value={password_2}
              onChange={(e) => setPassword2(e.target.value)}
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
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </Button>
          
          <div className="text-center mt-4">
            <span className="text-zinc-400 text-sm">Уже есть аккаунт? </span>
            <Link href="/login" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
