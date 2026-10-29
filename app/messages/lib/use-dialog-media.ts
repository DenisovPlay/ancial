'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AncialAPI } from '../../lib/api-v2';

export type DialogMediaKind = 'links' | 'media' | 'tracks';

export interface DialogMediaItem {
  date: string;
  height?: number;
  host?: string;
  media_id?: number;
  message_id: number;
  sender_id: number;
  text?: string;
  track_id?: number;
  url?: string;
  width?: number;
}

interface DialogMediaPage {
  has_more?: boolean;
  items?: DialogMediaItem[];
  next_before_id?: number;
}

interface KindState {
  failed: boolean;
  hasMore: boolean;
  items: DialogMediaItem[];
  loaded: boolean;
  loading: boolean;
  nextBefore: number;
}

const EMPTY: KindState = { failed: false, hasMore: true, items: [], loaded: false, loading: false, nextBefore: 0 };

/**
 * Фото, ссылки и треки переписки для экрана «Информация о чате»: каждая вкладка грузится при первом открытии и
 * догружается страницами (по before_id). Смена диалога или закрытие окна сбрасывают всё.
 */
export function useDialogMedia(dialogId: number, enabled: boolean) {
  const [state, setState] = useState<Record<DialogMediaKind, KindState>>({ links: EMPTY, media: EMPTY, tracks: EMPTY });
  const stateRef = useRef(state);
  const generationRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  });

  // Другой диалог или окно закрыли — начинаем с чистого листа, поздние ответы прежнего запроса отбрасываем.
  useEffect(() => {
    generationRef.current += 1;
    const empty = { links: EMPTY, media: EMPTY, tracks: EMPTY };
    stateRef.current = empty;
    // Сброс по смене ключа (диалог/открытие) — сеттлер здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(empty);
  }, [dialogId, enabled]);

  const loadMore = useCallback((kind: DialogMediaKind) => {
    const current = stateRef.current[kind];
    if (!enabled || !dialogId || current.loading || !current.hasMore) return;
    const generation = generationRef.current;
    const patch = (next: Partial<KindState>) => {
      if (generation !== generationRef.current) return;
      setState((previous) => ({ ...previous, [kind]: { ...previous[kind], ...next } }));
    };
    patch({ failed: false, loading: true });
    void AncialAPI.dialogMedia<DialogMediaPage>(dialogId, kind, current.nextBefore)
      .then((page) => {
        if (generation !== generationRef.current) return;
        setState((previous) => {
          const known = new Set(previous[kind].items.map((item) => `${item.message_id}:${item.url ?? item.track_id ?? ''}`));
          const fresh = (page.items ?? []).filter((item) => !known.has(`${item.message_id}:${item.url ?? item.track_id ?? ''}`));
          return {
            ...previous,
            [kind]: {
              failed: false,
              hasMore: Boolean(page.has_more) && Number(page.next_before_id) > 0,
              items: [...previous[kind].items, ...fresh],
              loaded: true,
              loading: false,
              nextBefore: Number(page.next_before_id) || previous[kind].nextBefore,
            },
          };
        });
      })
      .catch(() => patch({ failed: true, loaded: true, loading: false }));
  }, [dialogId, enabled]);

  return { loadMore, state };
}
