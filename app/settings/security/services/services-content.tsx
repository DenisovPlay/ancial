'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, type AuthService } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import Icon from '../../../components/svg-icon';
import BrandLoader from '../../../components/brand-loader';
import ErrorState from '../../../components/error-state';

function formatDateTime(value: string, langName?: string): string {
  const ts = value?.includes('T') ? value : value?.replace(' ', 'T');
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return value || '';
  const locale = langName === 'en' ? 'en-US' : langName === 'be' ? 'be-BY' : 'ru-RU';
  return date.toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ServicesSkeleton() {
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

export default function ServicesContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [services, setServices] = useState<AuthService[]>(() => {
    return cache.get<AuthService[]>('auth_services_cache', { category: 'profile', subcategory: 'services' }) ?? [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = cache.get<AuthService[]>('auth_services_cache', { category: 'profile', subcategory: 'services' });
    return !cached || cached.length === 0;
  });
  const [failed, setFailed] = useState(false);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/services');
    }
  }, [isAuthenticated, isLoading, router]);

  // Фоновое обновление данных с сервера
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    void (async () => {
      try {
        const result = await AncialAPI.authServices();
        if (cancelled) return;
        const list = Array.isArray(result.services) ? result.services : [];
        setServices(list);
        setFailed(false);
        cache.set('auth_services_cache', list, { category: 'profile', subcategory: 'services' });
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
    async (clientId: string) => {
      setBusyClientId(clientId);
      try {
        const result = await AncialAPI.revokeAuthService(clientId);
        const list = Array.isArray(result.services) ? result.services : [];
        setServices(list);
        cache.set('auth_services_cache', list, { category: 'profile', subcategory: 'services' });
        showNote({ content: lang?.services_revoked_ok || 'Доступ отозван', type: 'success', time: 3 });
      } catch {
        showNote({ content: lang?.services_revoke_error || 'Не удалось отозвать доступ', type: 'error', time: 4 });
      } finally {
        setBusyClientId(null);
      }
    },
    [lang, showNote],
  );

  const revokeAll = useCallback(async () => {
    setRevokingAll(true);
    try {
      const result = await AncialAPI.revokeAllAuthServices();
      const list = Array.isArray(result.services) ? result.services : [];
      setServices(list);
      cache.set('auth_services_cache', list, { category: 'profile', subcategory: 'services' });
      showNote({ content: lang?.services_all_revoked_ok || 'Доступ отозван у всех сервисов', type: 'success', time: 3 });
    } catch {
      showNote({ content: lang?.services_revoke_error || 'Не удалось отозвать доступ', type: 'error', time: 4 });
    } finally {
      setRevokingAll(false);
    }
  }, [lang, showNote]);

  if (isLoading && !user) {
    return <BrandLoader page />;
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-indigo-500/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            {lang?.connected_services || 'Подключённые сервисы'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <p className="text-sm text-zinc-400 px-1">
          {lang?.services_subtitle || 'Сайты и приложения, которым вы разрешили вход через аккаунт Zypo.'}
        </p>

        {loading && services.length === 0 ? (
          <ServicesSkeleton />
        ) : failed && services.length === 0 ? (
          <ErrorState title={lang?.services_load_error || 'Не удалось загрузить список сервисов.'} />
        ) : services.length === 0 ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            {lang?.services_empty || 'Подключённых сервисов пока нет.'}
          </div>
        ) : (
          <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 overflow-hidden">
                  {service.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.icon_url}
                      alt={service.client_name}
                      className="h-7 w-7 object-contain"
                      onError={(e) => {
                        // Fallback на IC-globe при ошибке загрузки иконки сервиса
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<svg class="h-6 w-6 fill-indigo-400" viewBox="0 0 48 48"><use href="#IC-globe" /></svg>';
                        }
                      }}
                    />
                  ) : (
                    <Icon name="IC-globe" className="h-6 w-6 fill-indigo-400" />
                  )}
                </div>

                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                    {service.site_url ? (
                      <a
                        href={service.site_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline hover:text-indigo-300 duration-300"
                      >
                        {service.client_name}
                      </a>
                    ) : (
                      service.client_name
                    )}
                    <span className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">
                      {lang?.services_scope_profile || 'Базовый профиль'}
                    </span>
                  </span>
                  {service.site_url ? (
                    <span className="truncate text-xs text-zinc-400">
                      {service.site_url.replace(/^https?:\/\//, '')}
                    </span>
                  ) : null}
                  <span className="truncate text-xs text-zinc-500">
                    {lang?.services_last_used || 'Активность'}: {formatDateTime(service.last_used_at, lang?.langname)}
                    {service.authorized_at ? ` · ${lang?.services_authorized_at || 'Подключён'}: ${formatDateTime(service.authorized_at, lang?.langname)}` : ''}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void revokeOne(service.client_id)}
                  disabled={busyClientId === service.client_id}
                  aria-label={lang?.services_revoke || 'Отозвать доступ'}
                  data-tip={lang?.services_revoke || 'Отозвать доступ'}
                  className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer rounded-full border border-transparent text-red-400 duration-300 hover:border-red-500/30 hover:bg-red-500/15 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyClientId === service.client_id ? (
                    <Icon name="IC-loader" className="w-5 h-5 animate-spin fill-current" />
                  ) : (
                    <Icon name="IC-times" className="w-5 h-5 fill-current" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {services.length > 0 ? (
          <button
            type="button"
            onClick={() => void revokeAll()}
            disabled={revokingAll}
            className="w-full cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {revokingAll
              ? (lang?.loading || 'Загрузка...')
              : (lang?.services_revoke_all || 'Отозвать у всех сервисов')}
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
