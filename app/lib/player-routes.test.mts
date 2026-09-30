import assert from 'node:assert/strict';
import test from 'node:test';

import { isPlayerDisabledPath } from './player-routes.ts';

test('плеер отключён в кино и вложенных страницах', () => {
  assert.equal(isPlayerDisabledPath('/cinema'), true);
  assert.equal(isPlayerDisabledPath('/cinema/watch/123'), true);
});

test('плеер включён на остальных страницах', () => {
  assert.equal(isPlayerDisabledPath('/'), false);
  assert.equal(isPlayerDisabledPath('/pulse'), false);
  assert.equal(isPlayerDisabledPath('/cinemas'), false);
  assert.equal(isPlayerDisabledPath(null), false);
});
