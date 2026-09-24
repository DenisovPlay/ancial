import { useLayoutEffect, useRef, useState } from 'react';

type Callback = (...args: never[]) => unknown;

/**
 * Набор функций с постоянными ссылками, которые всегда вызывают свежую версию обработчика.
 *
 * Нужен там, где обработчики — обычные функции провайдера (замыкаются на текущий стейт),
 * а значение контекста должно меняться только вместе с данными: иначе каждый рендер провайдера
 * перерисовывал бы всех потребителей. Набор ключей фиксируется при первом рендере.
 */
export function useStableCallbacks<T extends Record<string, Callback>>(handlers: T): T {
  const handlersRef = useRef(handlers);

  // Layout-эффект срабатывает раньше любых useEffect, поэтому эффекты потомков уже видят свежие версии.
  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  const [stable] = useState(() => {
    const result: Record<string, Callback> = {};
    for (const key of Object.keys(handlers)) {
      result[key] = (...args: never[]) => (handlersRef.current[key] as Callback)(...args);
    }
    return result as T;
  });

  return stable;
}
