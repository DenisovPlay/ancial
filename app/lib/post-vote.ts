import { coerceToFinite as toNumber } from './convert';

interface VotablePost {
  rating?: number | string | null;
  user_vote_down?: string | null;
  user_vote_up?: string | null;
}

/**
 * Пересчёт голоса (лайк/дизлайк поста) после успешного ответа votePost —
 * раньше была продублирована по feed/group/profile/post-content (~40 строк
 * веток каждый раз). Повторное нажатие уже выставленного направления —
 * no-op, противоположное — снимает старый голос и ставит новый.
 */
export function applyVoteResult<T extends VotablePost>(post: T, direction: 'up' | 'down'): T {
  const currentVote =
    post.user_vote_up === 'voted'
      ? 'up'
      : post.user_vote_down === 'voted'
        ? 'down'
        : null;

  if (direction === 'up') {
    if (currentVote === 'up') return post;

    if (currentVote === 'down') {
      return {
        ...post,
        rating: toNumber(post.rating) + 1,
        user_vote_down: null,
        user_vote_up: null,
      };
    }

    return {
      ...post,
      rating: toNumber(post.rating) + 1,
      user_vote_down: null,
      user_vote_up: 'voted',
    };
  }

  if (currentVote === 'down') return post;

  if (currentVote === 'up') {
    return {
      ...post,
      rating: toNumber(post.rating) - 1,
      user_vote_down: null,
      user_vote_up: null,
    };
  }

  return {
    ...post,
    rating: toNumber(post.rating) - 1,
    user_vote_down: 'voted',
    user_vote_up: null,
  };
}
