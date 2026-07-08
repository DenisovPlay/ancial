'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/firebase-messaging-sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('[SW] Registered, scope:', registration.scope);

        // Принудительная проверка обновления при каждом запуске приложения.
        // Это гарантирует что пользователи получают новый SW без жёсткой перезагрузки.
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  }, []);

  return null;
}
