import { coerceToFinite as toNumber } from './convert';

interface BookmarkablePost {
  bookmarked_amount?: number | string | null;
  is_bookmarked?: boolean | number | string | null;
}

/**
 * Пересчёт is_bookmarked/bookmarked_amount после ответа bookmark-эндпоинта —
 * раньше был продублирован по feed/group/profile. Источник истины — поле
 * `action` ('added'/'removed'), которое реально возвращает бэкенд; optimisticValue
 * (значение, которое UI уже показал до ответа сервера) — только резервный вариант,
 * если action не пришёл.
 */
export function applyBookmarkResult<T extends BookmarkablePost>(
  post: T,
  action: string | undefined,
  optimisticValue: boolean,
): T {
  const isAdded = action === 'added';
  const isRemoved = action === 'removed';
  const nextBookmarked = isAdded ? true : isRemoved ? false : optimisticValue;
  const currentAmount = toNumber(post.bookmarked_amount);

  return {
    ...post,
    is_bookmarked: nextBookmarked,
    bookmarked_amount: Math.max(
      0,
      isAdded
        ? currentAmount + 1
        : isRemoved
          ? currentAmount - 1
          : currentAmount + (nextBookmarked ? 1 : -1),
    ),
  };
}
