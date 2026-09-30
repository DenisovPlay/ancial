'use client';

import { useEffect, useState } from 'react';

import { listDialogDraftPreviews, subscribeDraftKind } from '../../lib/drafts';

function textOf(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { text?: unknown };
    return typeof parsed.text === 'string' ? parsed.text.trim().slice(0, 120) : '';
  } catch {
    return '';
  }
}

/** Тексты черновиков по id диалога — для строки «Черновик: …» в списке чатов. */
export function useDialogDraftPreviews(enabled: boolean): Record<string, string> {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    listDialogDraftPreviews()
      .then((fromServer) => {
        if (!cancelled) setPreviews((current) => ({ ...fromServer, ...current }));
      })
      .catch(() => undefined);

    const off = subscribeDraftKind('dialog', (ref, draft) => {
      if (ref === '') {
        setPreviews({});
        return;
      }
      setPreviews((current) => {
        const next = { ...current };
        const text = draft ? textOf(draft.payload) : '';
        if (text) next[ref] = text;
        else delete next[ref];
        return next;
      });
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [enabled]);

  return previews;
}
