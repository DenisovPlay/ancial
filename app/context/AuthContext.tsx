'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
    } catch (error) {
      console.error('Ошибка при загрузке языка:', error);
    }
  };

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // 1. Проверяем текущую сессию на сервере
      const checkRes = await fetch(`/api/auth/check.php`);
      let checkData;
      try {
        checkData = await checkRes.json();
      } catch (e) {
         // Обработка случая, если сервер вернул не JSON (например, 500 ошибку)
         checkData = { auth: false };
      }

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
            
            // Если вошли по токену (сессия установлена) - получаем подробные данные
            const infoRes = await fetch(`/api/user/info.php?token=${token}`);
            const infoData = await infoRes.json();

            if (infoData.status === 'success') {
              setUser(infoData.response);
              setIsAuthenticated(true);
            } else {
              // Токен перестал работать
              setUser(null);
              setIsAuthenticated(false);
              localStorage.removeItem('token');
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
