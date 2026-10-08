'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type GoogleSuggestionsPayload = [string, string[]];
type JsonpWindow = Window & typeof globalThis & Record<string, unknown>;

/** Запросы, под которые подсказки не показываем (и просим быть добрее). */
const DISALLOWED = ['русня', 'хохлы', 'укропы', 'топчу ру', 'чурки', 'хачи', 'москал'];

/**
 * Подсказки Google к строке поиска (JSONP — у `suggestqueries.google.com` нет CORS). Первой идёт сама строка,
 * дальше до трёх подсказок. `skipNext()` — следующая смена строки сделана стрелками по списку: подсказки не обновляем.
 */
export function useSearchSuggestions(value: string, hl: string, onBlocked?: () => void) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const skipRef = useRef(false);
  const scriptIdRef = useRef<string | null>(null);
  const blockedRef = useRef(onBlocked);
  useEffect(() => {
    blockedRef.current = onBlocked;
  });

  const dropRequest = useCallback(() => {
    const id = scriptIdRef.current;
    if (!id) return;
    document.getElementById(id)?.remove();
    delete (window as JsonpWindow)[id];
    scriptIdRef.current = null;
  }, []);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === '') {
      // Пустой запрос — терминальное состояние: подсказки сброшены.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return undefined;
    }
    if (skipRef.current) {
      skipRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const lower = trimmed.toLowerCase();
      if (DISALLOWED.some((term) => lower.includes(term))) {
        setSuggestions([]);
        blockedRef.current?.();
        return;
      }

      dropRequest();
      const callbackName = `searchHelp_${Math.round(Math.random() * 1000000)}`;
      scriptIdRef.current = callbackName;
      (window as JsonpWindow)[callbackName] = (data: unknown) => {
        if (Array.isArray(data) && Array.isArray(data[1])) {
          const [, payload] = data as GoogleSuggestionsPayload;
          const rest = payload.filter((item) => typeof item === 'string' && item.toLowerCase() !== lower).slice(0, 3);
          setSuggestions([trimmed, ...rest]);
        }
      };
      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestqueries.google.com/complete/search?client=chrome&hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(trimmed)}&callback=${callbackName}`;
      document.head.appendChild(script);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [dropRequest, hl, value]);

  useEffect(() => dropRequest, [dropRequest]);

  return { suggestions, skipNext: () => { skipRef.current = true; } };
}
