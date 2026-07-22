'use client';

import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLangFromCache, saveLangToCache, locales, getStoredLangCode, saveStoredLangCode, SupportedLang } from '../lib/lang';
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
  language?: string;
  lang?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lang: Record<string, string> | null;
  langCode: SupportedLang;
  setLanguage: (code: SupportedLang) => void;
  checkAuth: (options?: { silent?: boolean; force?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  updateLang: (targetCode?: SupportedLang) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Canonical localStorage key for user_profile — must match cache.set() output.
// cache.set('user_profile', val, { category: 'profile' }) → key = 'ancial:profile:user_profile'
const USER_PROFILE_STORAGE_KEY = 'ancial:profile:user_profile';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [langCode, setLangCode] = useState<SupportedLang>(() => getStoredLangCode());
  const [lang, setLang] = useState<Record<string, string>>(() => locales[langCode] || locales['ru']);
  const [isLoading, setIsLoading] = useState(true);
  const authStateRef = useRef<{ isAuthenticated: boolean; user: User | null }>({
    isAuthenticated: false,
    user: null,
  });
  // Флаг: идёт процесс выхода — блокирует любые повторные checkAuth до явного сброса
  const isLoggingOutRef = useRef(false);

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

  const setLanguage = useCallback((code: SupportedLang) => {
    const validCode: SupportedLang = code === 'en' ? 'en' : 'ru';
    saveStoredLangCode(validCode);
    const dict = locales[validCode] || locales['ru'];
    setLangCode(validCode);
    setLang(dict);
    publishLangState(dict);
    saveLangToCache(dict);
  }, [publishLangState]);

  const updateLang = useCallback(async (targetCode?: SupportedLang) => {
    const code = targetCode || getStoredLangCode();
    setLanguage(code);
  }, [setLanguage]);

  const checkAuth = useCallback(async (options: { silent?: boolean; force?: boolean } = {}) => {
    // force=true сбрасывает флаг выхода (используется при новом логине)
    if (options.force) {
      isLoggingOutRef.current = false;
    }
    // Если идёт выход — не авторизовываем заново
    if (isLoggingOutRef.current) return;
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

      if (auth && nextUser) {
        try {
          cache.set('user_profile', nextUser, { category: 'profile' });
        } catch (e) {
          console.error('[Auth] Failed to cache user profile', e);
        }

        const userLang = (nextUser.language || nextUser.lang) as string | undefined;
        if (userLang && (userLang === 'ru' || userLang === 'en')) {
          setLanguage(userLang as SupportedLang);
        }
      }
    };

    const tryRestoreFromOfflineCache = () => {
      try {
        const cachedUser = cache.get<User>('user_profile');
        const token = cache.get<string>('token');
        if (cachedUser && token) {
          console.log('[Auth] Восстановление авторизации из локального кэша в офлайне.');
          applyAuthState(true, cachedUser);
          return true;
        }
      } catch (e) {
        console.error('[Auth] Не удалось прочитать локальный кэш пользователя', e);
      }
      return false;
    };

    // Если устройство офлайн — сразу используем локальный кэш профиля
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (tryRestoreFromOfflineCache()) {
        if (!silent) setIsLoading(false);
        return;
      }
    }

    if (!silent) {
      setIsLoading(true);
    }
    publishAuthState(authStateRef.current.isAuthenticated, authStateRef.current.user, true);

    try {
      const readSessionUser = async () => {
        try {
          const checkRes = await fetch(`/api/V2/auth/CheckStatus.php`, {
            cache: 'no-store',
            credentials: 'include',
          });

          if (!checkRes.ok) {
            return { auth: false, isNetworkError: true };
          }

          const json = await checkRes.json();
          if (json.success && json.data) {
            return json.data;
          }
          return { auth: false };
        } catch {
          return { auth: false, isNetworkError: true };
        }
      };

      // 1. Проверяем текущую сессию на сервере
      let checkData = await readSessionUser();

      if (checkData.isNetworkError) {
        // Ошибка сети — пытаемся сохранить авторизацию через локальный кэш
        if (tryRestoreFromOfflineCache()) {
          return;
        }
      }

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

            // После логина по токену повторно читаем серверную сессию
            checkData = await readSessionUser();

            if (checkData.auth === true && checkData.user) {
              if (checkData.token) {
                cache.set('token', checkData.token, { category: 'profile' });
              }
              applyAuthState(true, checkData.user);
              window.GlobalWS?.init();
            } else if (checkData.isNetworkError && tryRestoreFromOfflineCache()) {
              return;
            } else {
              // Запасной путь для старых сценариев
              try {
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
              } catch {
                if (!tryRestoreFromOfflineCache()) {
                  applyAuthState(false, null);
                }
              }
            }
          } else {
            // Если мы офлайн или вызов провалился по сети — сохраняем сессию из кэша
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              if (tryRestoreFromOfflineCache()) {
                return;
              }
            }
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
      if (!tryRestoreFromOfflineCache()) {
        if (!silent) {
          applyAuthState(false, null);
        }
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
    const initialCode = getStoredLangCode();
    setLanguage(initialCode);
  }, [checkAuth, setLanguage]);

  useEffect(() => {
    const refreshAuth = () => {
      if (isLoggingOutRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
        return;
      }

      void checkAuth({ silent: true });
    };

    // 'storage' намеренно исключён: cache.set() внутри checkAuth сам генерирует
    // storage-события, что создаёт рекурсивный цикл CheckStatus запросов.
    window.addEventListener('focus', refreshAuth);
    window.addEventListener('online', refreshAuth);
    window.addEventListener('ancial-auth-session-restored', refreshAuth);
    window.addEventListener('ancial-auth-session-failed', refreshAuth);

    return () => {
      window.removeEventListener('focus', refreshAuth);
      window.removeEventListener('online', refreshAuth);
      window.removeEventListener('ancial-auth-session-restored', refreshAuth);
      window.removeEventListener('ancial-auth-session-failed', refreshAuth);
    };
  }, [checkAuth]);

  const logout = useCallback(async () => {
    // Блокируем любые checkAuth во время и после выхода
    isLoggingOutRef.current = true;

    // Сначала обновляем React-состояние, чтобы UI мгновенно отреагировал
    setUser(null);
    setIsAuthenticated(false);
    authStateRef.current = { isAuthenticated: false, user: null };
    publishAuthState(false, null, false);

    // Удаляем токен и профиль ДО остальных операций
    // cache.remove('token') удаляет сырой ключ 'token' (persistent, без namespace)
    cache.remove('token');
    // user_profile хранится с namespace: ancial:profile:user_profile — удаляем напрямую
    try {
      window.localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    } catch (e) {
      console.error('[Auth] Failed to remove user_profile from localStorage', e);
    }

    // Отключаем WebSocket, чтобы не было reconnect-попыток после выхода
    try {
      if (window.GlobalWS) {
        // init() с пустым токеном закроет сокет без реконнекта
        window.GlobalWS.init();
      }
    } catch (e) {
      console.error('[Auth] Ошибка при отключении WS', e);
    }

    // Чистим всё остальное (cache.clear() скипает PERSISTENT_KEYS, т.е. 'token' уже удалён выше)
    cache.clear();

    try {
      // ОБЯЗАТЕЛЬНО убиваем сессию на сервере (PHP cookie),
      // иначе CheckStatus.php будет продолжать возвращать auth: true
      await fetch(`/api/V2/auth/LogOut.php`, {
        credentials: 'include',
      });
    } catch (e) {
      console.error('Ошибка при логауте на сервере', e);
    }

    window.PlayerClose?.();

    // Мягкая навигация — без перезагрузки страницы.
    // router.replace вместо push, чтобы /login не попал в историю браузера
    // (нельзя вернуться назад на защищённую страницу).
    router.replace('/login');
  }, [publishAuthState, router]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, lang, langCode, setLanguage, checkAuth, logout, updateLang }}>
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
