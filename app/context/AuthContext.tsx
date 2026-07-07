'use client';

import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { getLangFromCache, saveLangToCache } from '../lib/lang';
import { restoreLegacyAuthSession } from '../lib/auth-fetch';
import { cache } from '../lib/cache.ts';

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
  checkAuth: (options?: { silent?: boolean }) => Promise<void>;
  logout: () => void;
  updateLang: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lang, setLang] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authStateRef = useRef<{ isAuthenticated: boolean; user: User | null }>({
    isAuthenticated: false,
    user: null,
  });

  const publishLangState = useCallback((nextLang: Record<string, string> | null) => {
    if (typeof window === 'undefined') return;
    (window as Window & { lang?: Record<string, string> | null }).lang = nextLang;
  }, []);

  const publishAuthState = useCallback((auth: boolean, nextUser: User | null, authChecking: boolean) => {
    if (typeof window === 'undefined') return;
    const legacyWindow = window as Window & {
      auth?: boolean;
      authChecking?: boolean;
      user?: User | null;
    };

    legacyWindow.auth = auth;
    legacyWindow.user = nextUser;
    legacyWindow.authChecking = authChecking;
  }, []);

  const updateLang = useCallback(async () => {
    try {
      const res = await fetch(`/api/V2/info/GetLang.php`);
      const payload = await res.json();
      const data = payload.success ? payload.data : payload;
      setLang(data);
      publishLangState(data);
      saveLangToCache(data);
    } catch (error) {
      console.error('Ошибка при загрузке языка:', error);
    }
  }, [publishLangState]);

  const checkAuth = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    let nextPublishedAuth = authStateRef.current.isAuthenticated;
    let nextPublishedUser = authStateRef.current.user;

    const applyAuthState = (auth: boolean, nextUser: User | null) => {
      nextPublishedAuth = auth;
      nextPublishedUser = nextUser;
      authStateRef.current = {
        isAuthenticated: auth,
        user: nextUser,
      };
      setUser(nextUser);
      setIsAuthenticated(auth);
      publishAuthState(auth, nextUser, false);
    };

    if (!silent) {
      setIsLoading(true);
    }
    publishAuthState(authStateRef.current.isAuthenticated, authStateRef.current.user, true);
    try {
      const readSessionUser = async () => {
        const checkRes = await fetch(`/api/V2/auth/CheckStatus.php`, {
          cache: 'no-store',
          credentials: 'include',
        });

        try {
          const json = await checkRes.json();
          if (json.success && json.data) {
            return json.data;
          }
          return { auth: false };
        } catch {
          return { auth: false };
        }
      };

      // 1. Проверяем текущую сессию на сервере
      let checkData = await readSessionUser();

      if (checkData.auth === true && checkData.user) {
        if (checkData.token) {
          cache.set('token', checkData.token, { category: 'profile' });
        }
        // Пользователь авторизован на сервере
        applyAuthState(true, checkData.user);
        window.GlobalWS?.init();
      } else {
        // Разлогинило на сервере (или сессии нет). Пробуем войти по токену
        const token = cache.get<string>('token');
        if (token) {
          const restored = await restoreLegacyAuthSession(token);

          if (restored) {
            console.log('[Auth] Авторизован через токен. Обновляем данные.');

            // После логина по токену повторно читаем серверную сессию,
            // чтобы получить актуальную схему пользователя из check.php.
            checkData = await readSessionUser();

            if (checkData.auth === true && checkData.user) {
              if (checkData.token) {
                cache.set('token', checkData.token, { category: 'profile' });
              }
              applyAuthState(true, checkData.user);
              window.GlobalWS?.init();
            } else {
              // Запасной путь для старых сценариев, если check.php ещё не успел обновиться
              const formData = new URLSearchParams();
              formData.set('token', token);
              const infoRes = await fetch(`/api/V2/auth/Login.php`, {
                method: 'POST',
                body: formData.toString(),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                cache: 'no-store',
                credentials: 'include',
              });
              const infoData = await infoRes.json();

              if (infoData.success && infoData.data && infoData.data.user) {
                applyAuthState(true, infoData.data.user);
                window.GlobalWS?.init();
              } else {
                applyAuthState(false, null);
                cache.remove('token');
              }
            }
          } else {
            // Ошибка авторизации по токену (например, просрочен)
            applyAuthState(false, null);
            cache.remove('token');
          }
        } else {
          // Ни сессии, ни токена
          applyAuthState(false, null);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке авторизации:', error);
      if (!silent) {
        applyAuthState(false, null);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      if (silent) {
        publishAuthState(nextPublishedAuth, nextPublishedUser, false);
      }
    }
  }, [publishAuthState]);

  // Проверяем авторизацию при первой загрузке приложения
  useEffect(() => {
    checkAuth();
    // Сначала пробуем загрузить из кэша
    const cachedLang = getLangFromCache();
    if (cachedLang) {
      setLang(cachedLang);
      publishLangState(cachedLang);
    }
    // Затем обновляем в фоне
    updateLang();
  }, [checkAuth, publishLangState, updateLang]);

  useEffect(() => {
    const refreshAuth = () => {
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
        return;
      }

      void checkAuth({ silent: true });
    };

    window.addEventListener('focus', refreshAuth);
    window.addEventListener('online', refreshAuth);
    window.addEventListener('storage', refreshAuth);

    return () => {
      window.removeEventListener('focus', refreshAuth);
      window.removeEventListener('online', refreshAuth);
      window.removeEventListener('storage', refreshAuth);
    };
  }, [checkAuth]);

  const logout = async () => {
    // Удаляем токен и очищаем кэш
    cache.remove('token');
    cache.clear();
    
    try {
      // ОБЯЗАТЕЛЬНО убиваем сессию на сервере (PHP cookie), 
      // иначе check.php будет продолжать возвращать auth: true
      await fetch(`/api/V2/auth/LogOut.php`, {
        credentials: 'include',
      });
    } catch (e) {
      console.error('Ошибка при логауте на сервере', e);
    }

    setUser(null);
    setIsAuthenticated(false);
    authStateRef.current = {
      isAuthenticated: false,
      user: null,
    };
    publishAuthState(false, null, false);
    window.PlayerClose?.();
    
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
