/**
 * Снимки ленты в памяти: при «Назад» из поста лента поднимается со всеми уже подгруженными
 * постами без нового запроса. Не в localStorage — списки большие; хранится не больше MAX_SNAPSHOTS.
 */

export interface FeedSnapshot<P> {
  cacheKey: string;
  currentLastId: string | number;
  hasMorePages: boolean;
  posts: P[];
}

const MAX_SNAPSHOTS = 3;
const snapshots = new Map<string, FeedSnapshot<unknown>>();

export function saveFeedSnapshot<P>(entryKey: string, snapshot: FeedSnapshot<P>) {
  snapshots.delete(entryKey);
  snapshots.set(entryKey, snapshot);
  while (snapshots.size > MAX_SNAPSHOTS) {
    const oldest = snapshots.keys().next().value;
    if (oldest === undefined) break;
    snapshots.delete(oldest);
  }
}

/** Снимок записи истории, только если он для той же темы и того же пользователя. */
export function getFeedSnapshot<P>(entryKey: string, cacheKey: string): FeedSnapshot<P> | null {
  const snapshot = snapshots.get(entryKey);
  if (!snapshot || snapshot.cacheKey !== cacheKey) return null;
  return snapshot as FeedSnapshot<P>;
}

/** Публикация, удаление и правка постов делают снимки устаревшими. */
export function clearFeedSnapshots() {
  snapshots.clear();
}
