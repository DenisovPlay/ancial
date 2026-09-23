'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, type AuthSession } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import Icon from '../../../components/svg-icon';

function formatDateTime(value: string, langName?: string): string {
  const ts = value?.includes('T') ? value : value?.replace(' ', 'T');
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return value || '';
  const locale = langName === 'en' ? 'en-US' : langName === 'be' ? 'be-BY' : 'ru-RU';
  return date.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function methodLabel(session: AuthSession, lang: Record<string, string> | null): string {
  const base =
    session.auth_method === 'passkey'
      ? lang?.method_passkey || 'Passkey'
      : session.auth_method === 'oauth'
        ? lang?.method_oauth || 'Вход через сервис'
        : session.auth_method === 'legacy'
          ? lang?.method_legacy || 'Совместимость'
          : lang?.method_password || 'Пароль';
  // Второй фактор дописываем, только если он реально другой метод (passkey-вход и так «Passkey»).
  if (session.second_factor === 'totp' && session.auth_method !== 'totp') return `${base} + 2FA`;
  if (session.second_factor === 'passkey' && session.auth_method !== 'passkey') return `${base} + Passkey`;
  return base;
}

function deviceTitle(session: AuthSession, lang: Record<string, string> | null): string {
  return session.device_label || lang?.session_unknown_device || 'Неизвестное устройство';
}

function deviceIcon(deviceType: AuthSession['device_type']): string {
  return deviceType === 'mobile' || deviceType === 'tablet' ? 'IC-mobile' : 'IC-laptop';
}

function SessionsSkeleton() {
  return (
    <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0">
          <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-700/60 animate-pulse" />
          <div className="flex min-w-0 flex-grow flex-col gap-2">
            <div className="h-4 w-40 rounded-full bg-zinc-700/60 animate-pulse" />
            <div className="h-3 w-56 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-3 w-32 rounded-full bg-zinc-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SessionsContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/sessions');
    }
  }, [isAuthenticated, isLoading, router]);

  // Кеш-first: сначала показываем сохранённый список, затем фоновое обновление и запись в кеш.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const cached = cache.get<AuthSession[]>('auth_sessions_cache', { category: 'profile', subcategory: 'sessions' });
    if (cached && cached.length > 0) {
      // Есть кеш — показываем сразу, скелетон не нужен.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessions(cached);
      setLoading(false);
    }

    void (async () => {
      try {
        const result = await AncialAPI.authSessions();
        if (cancelled) return;
        const list = Array.isArray(result.sessions) ? result.sessions : [];
        setSessions(list);
        setFailed(false);
        cache.set('auth_sessions_cache', list, { category: 'profile', subcategory: 'sessions' });
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const revokeOne = useCallback(
    async (id: number) => {
      setBusyId(id);
      try {
        // Список перечитываем из ответа сервера: строка должна реально исчезнуть, а не оптимистично.
        const result = await AncialAPI.revokeAuthSession(id);
        const list = Array.isArray(result.sessions) ? result.sessions : [];
        setSessions(list);
        cache.set('auth_sessions_cache', list, { category: 'profile', subcategory: 'sessions' });
        showNote({ content: lang?.sessions_revoked_ok || 'Сессия завершена', type: 'success', time: 3 });
      } catch {
        showNote({ content: lang?.sessions_revoke_error || 'Не удалось завершить сессию', type: 'error', time: 4 });
      } finally {
        setBusyId(null);
      }
    },
    [lang, showNote],
  );

  const revokeOthers = useCallback(async () => {
    setRevokingOthers(true);
    try {
      const result = await AncialAPI.revokeOtherAuthSessions();
      const list = Array.isArray(result.sessions) ? result.sessions : [];
      setSessions(list);
      cache.set('auth_sessions_cache', list, { category: 'profile', subcategory: 'sessions' });
      showNote({ content: lang?.sessions_revoked_ok || 'Сессии завершены', type: 'success', time: 3 });
    } catch {
      showNote({ content: lang?.sessions_revoke_error || 'Не удалось завершить сессии', type: 'error', time: 4 });
    } finally {
      setRevokingOthers(false);
    }
  }, [lang, showNote]);

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <Icon name="IC-loader" className="w-10 h-10 animate-spin fill-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const hasOthers = sessions.some((session) => !session.current);

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-sky-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            {lang?.active_sessions || 'Активные сессии'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <p className="text-sm text-zinc-400 px-1">
          {lang?.sessions_subtitle || 'Устройства и браузеры, в которых выполнен вход в ваш аккаунт.'}
        </p>

        {loading && sessions.length === 0 ? (
          <SessionsSkeleton />
        ) : failed && sessions.length === 0 ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            {lang?.sessions_load_error || 'Не удалось загрузить список сессий.'}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            {lang?.sessions_empty || 'Активных сессий пока нет.'}
          </div>
        ) : (
          <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
                  <Icon name={deviceIcon(session.device_type)} className="h-6 w-6 fill-sky-400" />
                </div>

                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                    {deviceTitle(session, lang)}
                    {session.current ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-1 py-0.5 text-xs text-emerald-400">
                        {lang?.session_this_device || 'Это устройство'}
                      </span>
                    ) : null}
                    {session.is_trusted ? (
                      <span className="shrink-0 rounded-full bg-purple-500/15 px-1 py-0.5 text-xs text-purple-300">
                        {lang?.session_trusted || 'Доверенное'}
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-zinc-400">
                    {methodLabel(session, lang)}
                    {session.country_name ? ` · ${session.country_name}` : ''}
                    {session.ip_masked ? ` · ${session.ip_masked}` : ''}
                  </span>
                  <span className="truncate text-xs text-zinc-500">
                    {lang?.session_last_seen || 'Активность'}: {formatDateTime(session.last_seen_at, lang?.langname)}
                  </span>
                </div>

                {!session.current ? (
                  <button
                    type="button"
                    onClick={() => void revokeOne(session.id)}
                    disabled={busyId === session.id}
                    className="shrink-0 cursor-pointer rounded-full border border-transparent px-4 py-2 text-xs text-zinc-300 duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/80 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === session.id ? (lang?.loading || 'Загрузка...') : lang?.sessions_revoke || 'Завершить'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {hasOthers ? (
          <button
            type="button"
            onClick={() => void revokeOthers()}
            disabled={revokingOthers}
            className="w-full cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {revokingOthers
              ? (lang?.loading || 'Загрузка...')
              : (lang?.sessions_revoke_others || 'Выйти со всех других устройств')}
          </button>
        ) : null}
      </div>

      <div className="lg:hidden">
        <br />
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}
