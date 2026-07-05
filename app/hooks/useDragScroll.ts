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
    const el = ref.current;
    if (!el || !enabled) return;

    if ('ontouchstart' in window && navigator.maxTouchPoints > 2) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      didMoveRef.current = false;
      el.classList.add('dragging');
      startX = e.clientX;
      scrollLeft = el.scrollLeft;
      e.preventDefault();
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove('dragging');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
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
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled, speed]);

  return ref;
}
