'use client';

import { useEffect, useRef } from 'react';

interface UseDragScrollOptions {
  speed?: number;
  enabled?: boolean;
}

export function useDragScroll(options: UseDragScrollOptions = {}) {
  const { speed = 2, enabled = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const didMoveRef = useRef(false);

  useEffect(() => {
    if (!enabled) return () => {};

    // Touch devices use native smooth touch scroll
    if ('ontouchstart' in window && navigator.maxTouchPoints > 2) return () => {};

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let dragEl: HTMLDivElement | null = null;
    let clickResetTimer: ReturnType<typeof setTimeout> | null = null;

    // Слушаем document, а ряд ищем уже в момент события: ряд может появиться позже монтирования
    // (в поиске Pulse секции рендерятся после загрузки), и обработчики на ref.current в эффекте
    // тогда просто не навешивались — перетаскивание не работало.
    const getElement = (target: EventTarget | null) => {
      const el = ref.current;
      if (!el || !(target instanceof Node) || !el.contains(target)) return null;
      return el;
    };

    const onDragStart = (e: DragEvent) => {
      if (!getElement(e.target)) return;
      e.preventDefault();
    };

    const onMouseDown = (e: MouseEvent) => {
      const el = getElement(e.target);
      if (!el) return;

      // Ignore form inputs where typing or text selection is required
      const target = e.target as HTMLElement;
      if (target.closest('input, select, textarea, [contenteditable="true"]')) return;

      isDown = true;
      dragEl = el;
      didMoveRef.current = false;
      startX = e.clientX;
      startY = e.clientY;
      scrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown || !dragEl) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Threshold of 6px to differentiate click/tap from drag scroll
      if (!didMoveRef.current && Math.sqrt(dx * dx + dy * dy) > 6) {
        didMoveRef.current = true;
        dragEl.classList.add('dragging');
        dragEl.style.userSelect = 'none';
        dragEl.style.cursor = 'grabbing';
      }

      if (didMoveRef.current) {
        e.preventDefault();
        dragEl.scrollLeft = scrollLeft - dx * speed;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      if (dragEl) {
        dragEl.classList.remove('dragging');
        dragEl.style.userSelect = '';
        dragEl.style.cursor = '';
      }
      dragEl = null;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!didMoveRef.current || !getElement(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (clickResetTimer) clearTimeout(clickResetTimer);
      clickResetTimer = setTimeout(() => {
        didMoveRef.current = false;
      }, 0);
    };

    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      if (clickResetTimer) clearTimeout(clickResetTimer);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled, speed]);

  return ref;
}
