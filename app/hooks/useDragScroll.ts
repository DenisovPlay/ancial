'use client';

import { useEffect, useRef } from 'react';

interface UseDragScrollOptions {
  speed?: number; // множитель скорости (по умолчанию 2)
  enabled?: boolean; // можно отключить для мобильных
}

export function useDragScroll(options: UseDragScrollOptions = {}) {
  const { speed = 2, enabled = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const didMoveRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    // Отключаем на тач-устройствах
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      didMoveRef.current = false;
      el.classList.add('dragging');
      const rect = el.getBoundingClientRect();
      startX = e.clientX - rect.left;
      scrollLeft = el.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown = false;
      el.classList.remove('dragging');
    };

    const onMouseUp = () => {
      isDown = false;
      el.classList.remove('dragging');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const walk = (x - startX) * speed;
      el.scrollLeft = scrollLeft - walk;
      
      // Помечаем, что было перемещение
      if (Math.abs(x - startX) > 3) {
        didMoveRef.current = true;
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    // Блокируем клики только если было перемещение
    el.addEventListener('click', (e) => {
      if (didMoveRef.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, [enabled, speed]);

  return ref;
}
