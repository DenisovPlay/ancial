'use client';

import { useEffect } from 'react';

import { APPEARANCE_CHANGE_EVENT, APPEARANCE_STORAGE_KEY, applyAppearance } from '../lib/appearance';

/**
 * Настройки внешнего вида применяет inline-скрипт в <head> до гидратации.
 * Здесь — повтор после гидратации и синхронизация: поменяли в другой вкладке — применяем и в этой.
 */
export default function AppearanceSync() {
  // Скрипт в <head> применяет настройки до отрисовки, но если React перерисует корень на клиенте
  // (сбой гидратации, HTML от старой сборки), атрибуты и переменные на <html> стираются —
  // и стекло/анимации откатываются к максимуму. Поэтому после монтирования применяем ещё раз.
  useEffect(() => {
    applyAppearance();
    window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_STORAGE_KEY) return;
      applyAppearance();
      window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return null;
}
