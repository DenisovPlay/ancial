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

    const el = ref.current;
    if (!el) return () => {};

    // Touch devices use native smooth touch scroll
    if ('ontouchstart' in window && navigator.maxTouchPoints > 2) return () => {};

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let clickResetTimer: ReturnType<typeof setTimeout> | null = null;

    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onMouseDown = (e: MouseEvent) => {
      // Ignore form inputs where typing or text selection is required
      const target = e.target as HTMLElement;
      if (target.closest('input, select, textarea, [contenteditable="true"]')) return;

      isDown = true;
      didMoveRef.current = false;
      startX = e.clientX;
      startY = e.clientY;
      scrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Threshold of 6px to differentiate click/tap from drag scroll
      if (!didMoveRef.current && Math.sqrt(dx * dx + dy * dy) > 6) {
        didMoveRef.current = true;
        el.classList.add('dragging');
        el.style.userSelect = 'none';
        el.style.cursor = 'grabbing';
      }

      if (didMoveRef.current) {
        e.preventDefault();
        el.scrollLeft = scrollLeft - dx * speed;
      }
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('dragging');
      el.style.userSelect = '';
      el.style.cursor = '';
    };

    const onClickCapture = (e: MouseEvent) => {
      if (didMoveRef.current) {
        e.preventDefault();
        e.stopPropagation();
        if (clickResetTimer) clearTimeout(clickResetTimer);
        clickResetTimer = setTimeout(() => {
          didMoveRef.current = false;
        }, 0);
      }
    };

    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('click', onClickCapture, true);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      if (clickResetTimer) clearTimeout(clickResetTimer);
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled, speed]);

  return ref;
}
