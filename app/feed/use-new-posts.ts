'use client';

import { useEffect, useState } from 'react';

import { AncialAPI } from '../lib/api-v2';
import { countNewPosts } from './new-posts';

const FIRST_CHECK_MS = 20_000;
const CHECK_INTERVAL_MS = 60_000;
const FOCUS_RECHECK_MS = 30_000;

/**
 * Считает новые посты, появившиеся в ленте, пока пользователь сидит на месте: лёгкий запрос peek
 * раз в минуту (только при видимой вкладке) и при возвращении на неё. Считает от самого свежего
 * из показанных постов, поэтому после обновления списка счётчик сам обнуляется.
 */
export function useNewPostsPeek(topic: string | null, newestId: number, enabled: boolean) {
  const stateKey = `${topic ?? ''}|${newestId}`;
  const [state, setState] = useState({ count: 0, key: '' });

  useEffect(() => {
    // Закладки идут не по id, у пустой ленты нет точки отсчёта.
    if (!enabled || newestId <= 0 || topic === 'bookmarked') return;

    let controller: AbortController | null = null;
    let lastCheckAt = Date.now();
    let disposed = false;

    const check = async () => {
      if (document.visibilityState === 'hidden') return;
      lastCheckAt = Date.now();
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await AncialAPI.getFeedPeek(topic ?? undefined, { signal: controller.signal });
        if (disposed) return;
        // Старый сервер peek не знает и вернёт ленту целиком: ids нет — плашку не показываем.
        setState({ count: countNewPosts(response.ids ?? [], newestId), key: stateKey });
      } catch {
        // Сеть недоступна — тихо пропускаем тик.
      }
    };

    const first = window.setTimeout(() => void check(), FIRST_CHECK_MS);
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheckAt >= FOCUS_RECHECK_MS) void check();
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [enabled, newestId, stateKey, topic]);

  return state.key === stateKey ? state.count : 0;
}
