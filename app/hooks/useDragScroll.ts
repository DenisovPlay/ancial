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
    if (!enabled) return;

    // Небольшая задержка чтобы Portal успел отрендериться (Modal.tsx использует rAF)
    const timer = setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      // На тач-устройствах нативный scroll работает лучше
      if ('ontouchstart' in window && navigator.maxTouchPoints > 2) return;

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;

      const onMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, textarea')) return;

        isDown = true;
        didMoveRef.current = false;
        startX = e.clientX;
        scrollLeft = el.scrollLeft;

        el.classList.add('dragging');
        el.style.userSelect = 'none';
        el.style.cursor = 'grabbing';

        e.preventDefault();
      };

      const onMouseUp = () => {
        if (!isDown) return;
        isDown = false;
        el.classList.remove('dragging');
        el.style.userSelect = '';
        el.style.cursor = '';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        el.scrollLeft = scrollLeft - dx * speed;
        if (Math.abs(dx) > 3) {
          didMoveRef.current = true;
        }
      };

      const onClickCapture = (e: MouseEvent) => {
        if (didMoveRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('click', onClickCapture, true);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mousemove', onMouseMove);

      // Сохраняем cleanup на элементе чтобы вызвать его из внешнего return
      type ElWithCleanup = HTMLDivElement & { _dragCleanup?: () => void };
      (el as ElWithCleanup)._dragCleanup = () => {
        el.removeEventListener('mousedown', onMouseDown);
        el.removeEventListener('click', onClickCapture, true);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mousemove', onMouseMove);
        delete (el as ElWithCleanup)._dragCleanup;
      };
    }, 50);

    return () => {
      clearTimeout(timer);
      const el = ref.current;
      if (el) {
        type ElWithCleanup = HTMLDivElement & { _dragCleanup?: () => void };
        (el as ElWithCleanup)._dragCleanup?.();
      }
    };
  }, [enabled, speed]);

  return ref;
}
