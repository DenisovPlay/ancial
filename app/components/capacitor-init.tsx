'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { initCapacitor, isCapacitorNative } from '../lib/capacitor';

export default function CapacitorInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitorNative()) return;

    const cleanup = initCapacitor({
      onBackButton: () => {
        // Проверяем, открыты ли стандартные модальные окна
        const openModals = document.querySelectorAll('[role="dialog"], [data-modal="true"], .modal-open');
        if (openModals.length > 0) {
          // Имитируем Escape для закрытия модалки
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          return true; // обработано
        }
        return false; // пусть router.back() обработает
      },
    });

    return () => {
      cleanup();
    };
  }, [router]);

  return null;
}
