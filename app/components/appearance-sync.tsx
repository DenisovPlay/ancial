'use client';

import { useEffect } from 'react';

import { APPEARANCE_CHANGE_EVENT, APPEARANCE_STORAGE_KEY, applyAppearance } from '../lib/appearance';

/**
 * Настройки внешнего вида применяет inline-скрипт в <head> до гидратации.
 * Здесь — только синхронизация: поменяли в другой вкладке — применяем и в этой.
 */
export default function AppearanceSync() {
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
