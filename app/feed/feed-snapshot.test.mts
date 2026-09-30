import assert from 'node:assert/strict';
import test from 'node:test';

import { clearFeedSnapshots, getFeedSnapshot, saveFeedSnapshot } from './feed-snapshot.ts';

const snap = (cacheKey: string, n = 1) => ({ cacheKey, currentLastId: n, hasMorePages: true, posts: [{ id: n }] });

test('снимок отдаётся только для той же темы и пользователя', () => {
  clearFeedSnapshots();
  saveFeedSnapshot('e1', snap('feed:user-1:all'));
  assert.equal(getFeedSnapshot('e1', 'feed:user-1:all')?.posts.length, 1);
  assert.equal(getFeedSnapshot('e1', 'feed:user-2:all'), null);
  assert.equal(getFeedSnapshot('nope', 'feed:user-1:all'), null);
});

test('хранится не больше трёх снимков, старые вытесняются', () => {
  clearFeedSnapshots();
  ['a', 'b', 'c', 'd'].forEach((key, i) => saveFeedSnapshot(key, snap('k', i)));
  assert.equal(getFeedSnapshot('a', 'k'), null);
  assert.ok(getFeedSnapshot('d', 'k'));
});

test('clearFeedSnapshots сбрасывает всё', () => {
  saveFeedSnapshot('x', snap('k'));
  clearFeedSnapshots();
  assert.equal(getFeedSnapshot('x', 'k'), null);
});
