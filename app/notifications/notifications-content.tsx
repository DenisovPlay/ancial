"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useLoadMoreObserver } from '../hooks/use-load-more-observer';
import { AncialAPI } from '../lib/api-v2';
import { cn } from '../lib/cn';
import { groupNotificationsByDay, type DayBucket } from '../lib/notifications/kinds';
import type { NotificationFilter, RichNotification } from '../lib/notifications/types';
import { useNotificationFeed } from '../lib/notifications/use-notification-feed';
import NotificationRow from './notification-row';

const FILTERS: Array<{ id: NotificationFilter; key: string; fallback: string }> = [
  { id: 'all', key: 'notif_filter_all', fallback: 'Все' },
  { id: 'people', key: 'notif_filter_people', fallback: 'Люди' },
  { id: 'content', key: 'notif_filter_content', fallback: 'Контент' },
  { id: 'security', key: 'notif_filter_security', fallback: 'Безопасность' },
];

const BUCKET_LABELS: Record<DayBucket, { key: string; fallback: string }> = {
  earlier: { key: 'notif_earlier', fallback: 'Ранее' },
  today: { key: 'notif_today', fallback: 'Сегодня' },
  yesterday: { key: 'notif_yesterday', fallback: 'Вчера' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, langCode } = useAuth();
  const { showNote } = useNotification();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const feed = useNotificationFeed(filter, isAuthenticated);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/notifications');
    }
  }, [isAuthenticated, authLoading, router]);

  useLoadMoreObserver(sentinelRef, () => void feed.loadMore(), [feed.loadMore, feed.hasMore, feed.items.length]);

  const sections = useMemo(() => groupNotificationsByDay(feed.items), [feed.items]);

  const handleDelete = useCallback((notification: RichNotification) => feed.remove(notification.id), [feed]);

  const handleAction = useCallback(
    async (notification: RichNotification, actionId: string) => {
      const actorId = notification.actors[0]?.id;
      try {
        if (actionId === 'accept' && actorId) {
          await AncialAPI.friendAction('add', actorId);
          feed.remove(notification.id);
        } else if (actionId === 'decline' && actorId) {
          await AncialAPI.friendAction('delete', actorId);
          feed.remove(notification.id);
        } else if (actionId === 'confirm') {
          feed.remove(notification.id);
        } else if (actionId === 'deny') {
          router.push('/settings/security/sessions');
        }
      } catch (error) {
        console.error('Notification action failed', error);
        showNote({ content: lang?.somethingwrong || 'Что-то пошло не так', type: 'error', time: 5 });
      }
    },
    [feed, lang?.somethingwrong, router, showNote],
  );

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex flex-col justify-center items-center py-10 w-full">
        <span className="text-zinc-400">{lang?.['loading...'] || 'Загрузка...'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-3 py-3 w-full">
      <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0">
        <span>{lang?.notif || 'Уведомления'}</span>
      </span>

      <div className="flex flex-col gap-3 w-full max-w-3xl sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent p-3 lg:px-0 -my-3" style={{ zIndex: 90 }}>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-grow gap-3 overflow-x-auto pb-0.5" role="tablist" aria-label={lang?.notif || 'Уведомления'}>
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold duration-300 active:scale-95',
                  filter === item.id ? 'border-white bg-white text-black' : 'border-zinc-600/30 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800',
                )}
              >
                {lang?.[item.key] || item.fallback}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void feed.clearAll().catch((error: unknown) => console.error('Error clearing notifications:', error))}
            className="glass-panel [--glass-alpha:0.2] [--glass-sat:2] border border-zinc-600/30 hover:[--glass-tint:var(--color-zinc-700)] hover:[--glass-alpha:1] h-12 shrink-0 active:scale-95 px-4 py-2 duration-300 cursor-pointer shadow rounded-full text-zinc-100"
          >
            {lang?.clear || 'Очистить'}
          </button>
          <Link
            href="/settings/notifications"
            className="glass-panel [--glass-alpha:0.2] [--glass-sat:2] cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center border border-zinc-600/30 hover:[--glass-tint:var(--color-zinc-700)] hover:[--glass-alpha:1] active:scale-95 duration-300 rounded-full"
          >
            <Icon name="IC-settings" className="inline w-8 h-8 fill-white" />
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 max-w-3xl px-3 lg:px-0">
        {feed.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/70 rounded-3xl p-3 flex items-center gap-3 w-full shadow duration-300 border border-zinc-600/30">
              <div className="w-12 h-12 rounded-full bg-zinc-800 shrink-0 animate-pulse"></div>
              <div className="flex flex-col gap-3 w-full">
                <div className="h-4 w-1/2 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="h-3 w-24 bg-zinc-800 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))
        ) : feed.items.length > 0 ? (
          sections.map((section) => (
            <section key={section.bucket} className="flex flex-col gap-3">
              <h2 className="px-3 pt-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 lg:px-0">
                {lang?.[BUCKET_LABELS[section.bucket].key] || BUCKET_LABELS[section.bucket].fallback}
              </h2>
              <ul className="flex flex-col gap-3">
                {section.items.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    highlighted={feed.highlight.has(notification.id)}
                    lang={lang}
                    langCode={langCode}
                    notification={notification}
                    onAction={handleAction}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center duration-300">
            <AppImage width={224} height={224} src="/img/load-placeholders/nothingfound.webp" className="h-56 w-auto" alt="Nothing found" />
            <span className="text-base text-zinc-100 w-full text-center font-black">
              {feed.error ? (lang?.somethingwrong || 'Что-то пошло не так') : (lang?.notification_empty || 'Ничего нет')}
            </span>
            <span className="text-sm text-zinc-300 w-full text-center font-medium">
              {lang?.notification_empty_desc || 'Здесь будут Ваши уведомления'}
            </span>
          </div>
        )}

        <div ref={sentinelRef} className="h-1 w-full" />
        {feed.loadingMore ? (
          <div className="flex justify-center py-3">
            <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-purple-500" />
          </div>
        ) : null}
      </div>

      <div className="lg:hidden"><br/><br/><br/><br/></div>
    </div>
  );
}
