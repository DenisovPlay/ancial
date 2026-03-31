'use client';

import { useEffect, useRef } from 'react';

interface UseScrollPingPongOptions {
  duration?: number;
}

export function useScrollPingPong(options: UseScrollPingPongOptions = {}) {
  const { duration = 15 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const contentWidth = content.scrollWidth;
    const containerWidth = container.clientWidth;
    const maxScroll = contentWidth - containerWidth;

    if (maxScroll <= 0) return;

    let animationId: number;
    let position = 0;
    let speed = maxScroll / (duration * 60); // пикселей за кадр
    let direction = 1;

    const animate = () => {
      position += speed * direction;

      // Достигли конца — меняем направление
      if (position >= maxScroll) {
        position = maxScroll;
        direction = -1;
      } else if (position <= 0) {
        position = 0;
        direction = 1;
      }

      content.style.transform = `translateX(${-position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [duration]);

  return { containerRef, contentRef };
}
