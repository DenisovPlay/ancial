'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AncialAPI } from '../api-v2';
import { cache } from '../cache.ts';
import { globalWS } from '../global-ws';
import { matchesFilter } from './kinds';
import type { NotificationFilter, RichNotification } from './types';

const PAGE_SIZE = 30;
const CACHE_KEY = 'notifications_v2';

interface FeedState {
  error: boolean;
  filter: NotificationFilter;
  hasMore: boolean;
  /** Что было непрочитанным до открытия страницы — для подсветки в этом визите. */
  highlight: ReadonlySet<number>;
  items: RichNotification[];
  nextBefore: number | null;
}

interface CachedFeed {
  hasMore: boolean;
  items: RichNotification[];
  nextBefore: number | null;
}

function readEnvelope(payload: unknown): Record<string, unknown> {
  const envelope = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = envelope.data;
  return (data && typeof data === 'object' ? data : envelope) as Record<string, unknown>;
}

function isRichNotification(value: Record<string, unknown>): value is Record<string, unknown> & RichNotification {
  return typeof value.id === 'number' && typeof value.kind === 'string' && Array.isArray(value.actors);
}

function readCachedFeed(): FeedState | null {
  const cached = cache.get<CachedFeed>(CACHE_KEY, { category: 'notifications', subcategory: 'list' });
  if (!cached || !Array.isArray(cached.items)) return null;
  return { error: false, filter: 'all', hasMore: Boolean(cached.hasMore), highlight: new Set(), items: cached.items, nextBefore: cached.nextBefore ?? null };
}

/**
 * Лента уведомлений: первая страница под фильтр, догрузка по before_id, живое обновление по WS.
 * Страница открыта — значит прочитано (как и раньше), но то, что было новым, подсвечивается в этом визите.
 */
export function useNotificationFeed(filter: NotificationFilter, enabled: boolean) {
  const [state, setState] = useState<FeedState | null>(() => readCachedFeed());
  const [loadingMore, setLoadingMore] = useState(false);
  const busyRef = useRef(false);
  const markedRef = useRef(false);
  const stateRef = useRef<FeedState | null>(state);

  useEffect(() => {
    stateRef.current = state;
  });

  const markAllRead = useCallback(() => {
    void AncialAPI.markNotificationsRead().catch(() => null);
    window.dispatchEvent(new CustomEvent('ancial:unread_update', { detail: { type: 'clear_notifications' } }));
  }, []);

  // Первая страница под текущий фильтр.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const page = await AncialAPI.getNotificationsPage({ filter, limit: PAGE_SIZE });
        if (cancelled) return;
        setState({
          error: false,
          filter,
          hasMore: page.has_more,
          highlight: new Set(page.notifications.filter((item) => !item.read).map((item) => item.id)),
          items: page.notifications,
          nextBefore: page.next_before_id,
        });
        if (!markedRef.current) {
          markedRef.current = true;
          markAllRead();
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load notifications', error);
        setState({ error: true, filter, hasMore: false, highlight: new Set(), items: [], nextBefore: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, filter, markAllRead]);

  // Живое обновление: новые/склеенные уведомления, прочтение и удаление с других устройств.
  useEffect(() => {
    if (!enabled) return undefined;

    const onNew = (payload?: unknown) => {
      const data = readEnvelope(payload);
      if (!isRichNotification(data) || !matchesFilter(data.kind, filter)) return;
      const replaces = typeof data.replaces_id === 'number' ? data.replaces_id : null;
      setState((current) => {
        if (!current || current.filter !== filter) return current;
        const items = [data, ...current.items.filter((item) => item.id !== data.id && item.id !== replaces)];
        return { ...current, highlight: new Set(current.highlight).add(data.id), items };
      });
      // Страница открыта — новое уведомление сразу считается прочитанным.
      void AncialAPI.markNotificationRead(data.id).catch(() => null);
      window.dispatchEvent(new CustomEvent('ancial:unread_update', { detail: { type: 'clear_notifications' } }));
    };

    const onRead = (payload?: unknown) => {
      const data = readEnvelope(payload);
      if (data.cleared === true) {
        setState((current) => (current ? { ...current, hasMore: false, items: [] } : current));
        return;
      }
      if (data.deleted === true && typeof data.id === 'number') {
        setState((current) => (current ? { ...current, items: current.items.filter((item) => item.id !== data.id) } : current));
      }
    };

    globalWS.addDialogListener('notification:new', onNew);
    globalWS.addDialogListener('notification:read', onRead);
    return () => {
      globalWS.removeDialogListener('notification:new', onNew);
      globalWS.removeDialogListener('notification:read', onRead);
    };
  }, [enabled, filter]);

  // Кэш первой страницы общего списка — для мгновенного показа при следующем открытии.
  useEffect(() => {
    if (!state || state.filter !== 'all' || state.error) return;
    cache.set(CACHE_KEY, { hasMore: state.hasMore, items: state.items.slice(0, PAGE_SIZE), nextBefore: state.nextBefore } satisfies CachedFeed, {
      category: 'notifications',
      subcategory: 'list',
    });
  }, [state]);

  const loadMore = useCallback(async () => {
    const current = stateRef.current;
    if (!current || busyRef.current || !current.hasMore || current.nextBefore === null || current.filter !== filter) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const page = await AncialAPI.getNotificationsPage({ beforeId: current.nextBefore, filter, limit: PAGE_SIZE });
      setState((latest) => {
        if (!latest || latest.filter !== filter) return latest;
        const known = new Set(latest.items.map((item) => item.id));
        return {
          ...latest,
          hasMore: page.has_more,
          highlight: new Set([...latest.highlight, ...page.notifications.filter((item) => !item.read).map((item) => item.id)]),
          items: [...latest.items, ...page.notifications.filter((item) => !known.has(item.id))],
          nextBefore: page.next_before_id,
        };
      });
    } catch (error) {
      console.error('Failed to load more notifications', error);
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [filter]);

  const remove = useCallback((id: number) => {
    setState((current) => (current ? { ...current, items: current.items.filter((item) => item.id !== id) } : current));
    void AncialAPI.deleteNotification(id).catch((error: unknown) => console.error('Failed to delete notification', error));
  }, []);

  const clearAll = useCallback(async () => {
    await AncialAPI.clearNotifications();
    setState((current) => (current ? { ...current, hasMore: false, items: [] } : current));
    cache.remove(CACHE_KEY, { category: 'notifications', subcategory: 'list' });
  }, []);

  const ready = Boolean(state) && state?.filter === filter;
  return {
    clearAll,
    error: ready ? Boolean(state?.error) : false,
    hasMore: ready ? Boolean(state?.hasMore) : false,
    highlight: state?.highlight ?? new Set<number>(),
    isLoading: !ready,
    items: ready && state ? state.items : [],
    loadMore,
    loadingMore,
    remove,
  };
}
