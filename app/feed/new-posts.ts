/** Сколько верхних постов запрашивает peek; если все новее нашего верхнего — показываем «20+». */
export const NEW_POSTS_PEEK_LIMIT = 20;

/** Сколько постов в ответе peek новее самого свежего из уже показанных. */
export function countNewPosts(ids: readonly number[], newestId: number): number {
  if (!Number.isFinite(newestId) || newestId <= 0) return 0;
  return ids.filter((id) => id > newestId).length;
}

export function formatNewPostsCount(count: number): string {
  return count >= NEW_POSTS_PEEK_LIMIT ? `${NEW_POSTS_PEEK_LIMIT}+` : String(count);
}
