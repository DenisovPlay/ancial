'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Сколько строк ленты держим отрендеренными вокруг видимой области. */
export const CHAT_WINDOW_SIZE = 150;
/** Окно сдвигаем, только когда видимая область ушла от его центра дальше этого — без перерисовок на каждый скролл. */
const CHAT_WINDOW_HYSTERESIS = 30;
/** Ближе этого к новейшим — окно «прилипает» к низу (новые сообщения сразу в нём). */
const CHAT_WINDOW_BOTTOM_SNAP = 10;

/**
 * Окно рендера длинного чата: строки дальше ±CHAT_WINDOW_SIZE/2 от видимой области заменяются
 * пустышками той же (замеренной) высоты — раскладка и прокрутка не сдвигаются, а разметка,
 * картинки и меню дальних сообщений уходят из памяти. Строка без замера рендерится всегда.
 *
 * rowIds — ключи строк ленты по порядку (в т.ч. разделители дат); resetKey — смена диалога.
 */
export function useChatWindow(rowIds: readonly string[], resetKey: string) {
  const [anchor, setAnchor] = useState<{ key: string; id: string | null }>({ key: resetKey, id: null });
  const anchorId = anchor.key === resetKey ? anchor.id : null;
  const heightsRef = useRef(new Map<string, number>());
  const visibleRef = useRef(new Set<string>());
  /**
   * Строки, которые хоть раз были на экране. Замер берём только у них: пузырь с content-visibility,
   * ни разу не показанный, имеет оценочную высоту (--cv-size), а не настоящую.
   */
  const seenRef = useRef(new Set<string>());
  /** Строки, побывавшие пустышкой: их новый пузырь не помнит прежнего размера — подсказываем замером. */
  const unloadedRef = useRef(new Set<string>());
  const rowIdsRef = useRef(rowIds);
  const anchorIdRef = useRef(anchorId);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    rowIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [rowIds]);
  const indexByIdRef = useRef(indexById);

  useEffect(() => {
    rowIdsRef.current = rowIds;
    indexByIdRef.current = indexById;
    anchorIdRef.current = anchorId;
  });

  // Новый диалог — замеры прошлого не годятся.
  useEffect(() => {
    heightsRef.current = new Map();
    visibleRef.current = new Set();
    seenRef.current = new Set();
    unloadedRef.current = new Set();
  }, [resetKey]);

  const lastIndex = rowIds.length - 1;
  const anchorIndex = anchorId !== null ? indexById.get(anchorId) : undefined;
  const centerIndex = anchorIndex ?? lastIndex;
  const half = Math.floor(CHAT_WINDOW_SIZE / 2);
  const windowStart = anchorIndex === undefined ? lastIndex - CHAT_WINDOW_SIZE + 1 : centerIndex - half;
  const windowEnd = anchorIndex === undefined ? lastIndex : centerIndex + half;

  /** Пересчёт центра окна по видимым строкам. */
  const updateAnchor = useCallback(() => {
    const ids = rowIdsRef.current;
    const indexes = indexByIdRef.current;
    let minIndex = Infinity;
    let maxIndex = -Infinity;
    visibleRef.current.forEach((id) => {
      const index = indexes.get(id);
      if (index === undefined) return;
      minIndex = Math.min(minIndex, index);
      maxIndex = Math.max(maxIndex, index);
    });
    if (!Number.isFinite(minIndex)) return;

    const visibleCenter = Math.round((minIndex + maxIndex) / 2);
    const last = ids.length - 1;
    const currentAnchor = anchorIdRef.current;
    const currentCenter = currentAnchor !== null ? (indexes.get(currentAnchor) ?? last) : last;
    const nextId = visibleCenter >= last - CHAT_WINDOW_BOTTOM_SNAP ? null : ids[visibleCenter] ?? null;
    if (nextId === currentAnchor) return;
    if (Math.abs(visibleCenter - currentCenter) <= CHAT_WINDOW_HYSTERESIS && !(nextId === null && currentAnchor !== null && maxIndex >= last - CHAT_WINDOW_BOTTOM_SNAP)) return;

    anchorIdRef.current = nextId;
    setAnchor({ key: resetKey, id: nextId });
  }, [resetKey]);

  const observersRef = useRef<{ intersection: IntersectionObserver; resize: ResizeObserver } | null>(null);

  const getObservers = useCallback(() => {
    if (observersRef.current) return observersRef.current;
    if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') return null;
    const intersection = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const id = element.dataset.chatRow;
        if (!id) return;
        if (entry.isIntersecting) {
          visibleRef.current.add(id);
          if (element.dataset.chatPlaceholder !== 'true') {
            seenRef.current.add(id);
            // Дробная высота: offsetHeight округляет, и на сдвиге окна (десятки строк) ошибка копилась в прыжок.
            heightsRef.current.set(id, entry.boundingClientRect.height);
          }
        } else {
          visibleRef.current.delete(id);
        }
      });
      updateAnchor();
    });
    const resize = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement;
        const id = element.dataset.chatRow;
        // Пустышку не перемеряем: её высота и есть сохранённый замер.
        if (!id || element.dataset.chatPlaceholder === 'true' || !seenRef.current.has(id)) return;
        const box = entry.borderBoxSize?.[0];
        heightsRef.current.set(id, box ? box.blockSize : element.getBoundingClientRect().height);
      });
    });
    observersRef.current = { intersection, resize };
    return observersRef.current;
  }, [updateAnchor]);

  useEffect(() => () => {
    observersRef.current?.intersection.disconnect();
    observersRef.current?.resize.disconnect();
    observersRef.current = null;
  }, [getObservers]);

  /** Колбэк-реф строки (data-chat-row обязателен): наблюдение на время жизни элемента. */
  const observeRow = useCallback((element: HTMLDivElement | null) => {
    if (!element) return undefined;
    const rowId = element.dataset.chatRow;
    if (rowId && element.dataset.chatPlaceholder === 'true') unloadedRef.current.add(rowId);
    const observers = getObservers();
    if (!observers) return undefined;
    observers.intersection.observe(element);
    observers.resize.observe(element);
    return () => {
      observers.intersection.unobserve(element);
      observers.resize.unobserve(element);
      const id = element.dataset.chatRow;
      if (id) visibleRef.current.delete(id);
    };
  }, [getObservers]);

  /** Высота пустышки для строки вне окна; undefined — строку надо рендерить целиком. */
  const getPlaceholderHeight = useCallback((index: number, id: string) => {
    if (index >= windowStart && index <= windowEnd) return undefined;
    return heightsRef.current.get(id);
  }, [windowEnd, windowStart]);

  /**
   * Замеренная высота строки (для --chat-row-size): вернувшийся в окно пузырь до отрисовки занимает
   * ровно своё прежнее место, а не оценочные 64px, — лента не сдвигается. Строкам, которые не
   * выгружались, подсказка не нужна: браузер сам помнит их последний размер точнее замера.
   */
  const getKnownHeight = useCallback(
    (id: string) => (unloadedRef.current.has(id) ? heightsRef.current.get(id) : undefined),
    [],
  );

  /** Перед прокруткой к сообщению: окно переезжает к нему. false — такой строки в ленте нет. */
  const reveal = useCallback((id: string) => {
    if (!indexByIdRef.current.has(id)) return false;
    anchorIdRef.current = id;
    setAnchor({ key: resetKey, id });
    return true;
  }, [resetKey]);

  return { getKnownHeight, getPlaceholderHeight, observeRow, reveal };
}
