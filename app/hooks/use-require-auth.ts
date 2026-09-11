'use client';

import { useCallback } from 'react';

import { useAuth } from '../context/AuthContext';

type ShowPulseNote = (content: string, type?: 'error' | 'info' | 'success', time?: number, html?: boolean) => void;

/**
 * Гейт "залогинься, чтобы..." — раньше `if (!isAuthenticated) { showPulseNote(...); return; }`
 * дублировался 14 раз по 6 pulse-файлам. Возвращает true, если можно продолжать действие.
 */
export function useRequireAuth(showPulseNote: ShowPulseNote) {
  const { isAuthenticated } = useAuth();

  return useCallback((message: string) => {
    if (!isAuthenticated) {
      showPulseNote(message, 'info');
      return false;
    }
    return true;
  }, [isAuthenticated, showPulseNote]);
}
