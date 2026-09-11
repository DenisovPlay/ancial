'use client';

import { useCallback } from 'react';

/**
 * Единая обёртка над navigator.clipboard.writeText — раньше try/catch
 * дублировался по десятку файлов (сообщения, группы, посты, pulse, звонки).
 * Успех/ошибку (и текст тостов) каждый вызывающий код решает сам.
 */
export function useCopyToClipboard() {
  return useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);
}
