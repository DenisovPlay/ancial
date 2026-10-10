'use client';

import { useEffect, useRef } from 'react';

import { getLocalDraft, loadDraft, saveDraft, subscribeDraft } from '../../lib/drafts';

const SAVE_DELAY_MS = 500;

function toPayload(text: string) {
  return text.trim() === '' ? '' : JSON.stringify({ text });
}

function fromPayload(payload: string | undefined) {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload) as { text?: unknown };
    return typeof parsed.text === 'string' ? parsed.text : '';
  } catch {
    return '';
  }
}

/**
 * Черновик сообщения в открытом диалоге: сохраняется на устройстве и на сервере, подставляется при
 * возвращении в диалог и на других устройствах (WebSocket). Отправка сообщения (пустое поле) удаляет черновик.
 */
export function useDialogDraft(dialogId: number, text: string, setText: (value: string) => void, enabled: boolean) {
  const ref = enabled && dialogId > 0 ? String(dialogId) : '';
  const textRef = useRef(text);
  // Текст, с которым поле совпадает с сохранённым: пока они равны, правок «здесь» нет.
  const syncedRef = useRef('');
  const readyRef = useRef(false);
  // Правка, которая ещё ждёт отправки: при уходе из диалога сохраняем её сразу, а не теряем.
  const pendingRef = useRef<{ ref: string; text: string } | null>(null);
  // Текст прошлого диалога, который остался в поле в момент переключения: чужим черновиком он не становится.
  const staleTextRef = useRef('');

  useEffect(() => {
    textRef.current = text;
  });

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    readyRef.current = false;
    syncedRef.current = '';
    pendingRef.current = null;
    staleTextRef.current = textRef.current;
    textRef.current = '';
    setText('');

    const apply = (next: string) => {
      // Пользователь уже печатает своё — не перезаписываем.
      if (textRef.current !== syncedRef.current) return;
      syncedRef.current = next;
      setText(next);
    };

    const restore = async () => {
      const local = getLocalDraft('dialog', ref);
      if (local && !cancelled) apply(fromPayload(local.payload));
      try {
        const remote = await loadDraft('dialog', ref);
        if (!cancelled) apply(fromPayload(remote?.payload));
      } catch {
        // Сети нет — остаётся локальный.
      }
      if (!cancelled) readyRef.current = true;
    };
    void restore();

    const off = subscribeDraft('dialog', ref, (remote) => apply(fromPayload(remote?.payload)));
    return () => {
      cancelled = true;
      off();
      const pendingSave = pendingRef.current;
      if (pendingSave && pendingSave.ref === ref && readyRef.current) {
        pendingRef.current = null;
        saveDraft('dialog', ref, toPayload(pendingSave.text));
      }
    };
  }, [ref, setText]);

  useEffect(() => {
    if (!ref) return;
    if (staleTextRef.current) {
      if (text === staleTextRef.current) return;
      staleTextRef.current = '';
    }
    if (text === syncedRef.current) {
      // Правка отменена (например, сообщение отправлено до сохранения) — в черновик она не попадает.
      pendingRef.current = null;
      return;
    }
    pendingRef.current = { ref, text };
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      // До загрузки черновика поле пустое по умолчанию — это не «пользователь стёр текст».
      if (!readyRef.current) return;
      syncedRef.current = text;
      saveDraft('dialog', ref, toPayload(text));
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ref, text]);
}
