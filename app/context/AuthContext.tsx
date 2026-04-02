'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLangFromCache, saveLangToCache } from '../lib/lang';

// Типизация пользователя на основе данных обоих методов (check.php и info.php)
export interface User {
  id?: string;
  username?: string;
  login?: string;
  fname?: string;
  lname?: string;
  img?: string;
  desk?: string;
  description?: string;
  cover?: string;
  active?: string;
  status?: string;
  verify?: string;
  country?: string;
  city?: string;
  address?: string;
  zip?: string;
  phone?: string;
  yandex_phone?: string;
  email?: string;
  connected_yacc?: string;
  connected_telegram?: string;
  searchshow?: string;
  msgopen?: string;
  pushsid?: string;
  pushdevice?: string;
  numberverif?: boolean | string;
  emailverif?: boolean | string;
  veriflevel?: number | string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lang: Record<string, string> | null;
  checkAuth: () => Promise<void>;
  logout: () => void;
  updateLang: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lang, setLang] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateLang = async () => {
    try {
      const res = await fetch(`/api/info/lang.php`);
      const data = await res.json();
      setLang(data);
      saveLangToCache(data);
    } catch (error) {
      console.error('Ошибка при загрузке языка:', error);
    }
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const readSessionUser = async () => {
        const checkRes = await fetch(`/api/auth/check.php`, {
          credentials: 'include',
        });

        try {
          return await checkRes.json();
        } catch {
          return { auth: false };
        }
      };

      // 1. Проверяем текущую сессию на сервере
      let checkData = await readSessionUser();

      if (checkData.auth === true && checkData.user) {
        // Пользователь авторизован на сервере
        setUser(checkData.user);
        setIsAuthenticated(true);
      } else {
        // Разлогинило на сервере (или сессии нет). Пробуем войти по токену
        const token = localStorage.getItem('token');
        if (token) {
          const params = new URLSearchParams();
          params.append('do_login', 'True');
          params.append('token', token);

          const loginRes = await fetch(`/api/auth/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          });
          const loginData = await loginRes.json();

          if (loginData.status === 'success') {
            console.log('[Auth] Авторизован через токен. Обновляем данные.');

            // После логина по токену повторно читаем серверную сессию,
            // чтобы получить актуальную схему пользователя из check.php.
            checkData = await readSessionUser();

            if (checkData.auth === true && checkData.user) {
              setUser(checkData.user);
              setIsAuthenticated(true);
            } else {
              // Запасной путь для старых сценариев, если check.php ещё не успел обновиться
              const infoRes = await fetch(`/api/user/info.php?token=${token}`);
              const infoData = await infoRes.json();

              if (infoData.status === 'success') {
                setUser(infoData.response);
                setIsAuthenticated(true);
              } else {
                setUser(null);
                setIsAuthenticated(false);
                localStorage.removeItem('token');
              }
            }
          } else {
            // Ошибка авторизации по токену (например, просрочен)
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('token');
          }
        } else {
          // Ни сессии, ни токена
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Проверяем авторизацию при первой загрузке приложения
  useEffect(() => {
    checkAuth();
    // Сначала пробуем загрузить из кэша
    const cachedLang = getLangFromCache();
    if (cachedLang) {
      setLang(cachedLang);
    }
    // Затем обновляем в фоне
    updateLang();
  }, []);

  const logout = async () => {
    // Удаляем токен из локального хранилища
    localStorage.removeItem('token');
    
    try {
      // ОБЯЗАТЕЛЬНО убиваем сессию на сервере (PHP cookie), 
      // иначе check.php будет продолжать возвращать auth: true
      await fetch(`/api/auth/logout.php`);
    } catch (e) {
      console.error('Ошибка при логауте на сервере', e);
    }

    setUser(null);
    setIsAuthenticated(false);
    
    // Перенаправляем на окно логина
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, lang, checkAuth, logout, updateLang }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для упрощенного доступа к контексту
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
