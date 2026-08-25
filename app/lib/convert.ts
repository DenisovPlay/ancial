/**
 * Общие числовые/строковые конвертеры.
 *
 * В проекте исторически два варианта toNumber с РАЗНОЙ семантикой:
 * - parseToInt: Number.parseInt(String(v), 10) — обрезает мусорный хвост ('12abc' → 12).
 *   Живёт в app/pulse/pulse-components.tsx и app/messages/lib/messages-shared.tsx (toNumber).
 * - coerceToFinite: Number(v) — строгая конвертация ('12abc' → 0, booleans допустимы).
 *   Используйте этот модуль, если нужен именно строгий вариант.
 */

/** Строгое приведение к конечному числу; всё остальное → fallback (0). */
export function coerceToFinite(value: number | string | boolean | null | undefined, fallback = 0): number {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

/** Убирает пробелы по краям; null/undefined → ''. */
export function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

/** parseInt-семантика: '12abc' → 12, мусор → 0. Историческое toNumber из pulse/messages. */
export function parseToInt(value: number | string | null | undefined): number {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

/**
 * Декодирует HTML-сущности через textarea (клиентский DOM).
 * На сервере (typeof window === 'undefined') возвращает строку как есть.
 * Пустая/пробельная строка возвращается без декодирования.
 */
export function decodeHtmlEntities(value: string | null | undefined): string {
  const nextValue = normalizeText(value);
  if (!nextValue || typeof window === 'undefined') {
    return nextValue;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = nextValue;
  return textarea.value;
}
