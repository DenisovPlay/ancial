import assert from 'node:assert/strict';
import test from 'node:test';

import { countNewPosts, formatNewPostsCount } from '../../app/feed/new-posts.ts';

test('считаются только посты новее верхнего показанного', () => {
  assert.equal(countNewPosts([105, 104, 103, 102], 103), 2);
  assert.equal(countNewPosts([103, 102], 103), 0);
  assert.equal(countNewPosts([], 103), 0);
});

test('без известного верхнего поста плашки нет', () => {
  assert.equal(countNewPosts([5, 4], 0), 0);
  assert.equal(countNewPosts([5, 4], Number.NaN), 0);
});

test('потолок счётчика — 20+', () => {
  assert.equal(formatNewPostsCount(3), '3');
  assert.equal(formatNewPostsCount(20), '20+');
});
