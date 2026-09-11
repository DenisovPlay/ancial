'use client';

import { useCallback } from 'react';
import { useNotification } from '../context/NotificationContext';

export type PulseNoteKind = 'error' | 'info' | 'success';

/**
 * Единая обёртка над showNote с дефолтами, привычными для Pulse-страниц.
 * Раньше была продублирована по 7 файлам (pulse/profile/artist/track/playlist/search).
 */
export function usePulseNote() {
  const { showNote } = useNotification();

  return useCallback(
    (content: string, type: PulseNoteKind = 'info', time = 4, html = false) => {
      showNote({ content, time, type, html });
    },
    [showNote],
  );
}
