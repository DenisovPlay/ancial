import assert from 'node:assert/strict';
import test from 'node:test';

import { isPlayerDisabledPath, isPlayerSuspendedPath } from './player-routes.ts';

test('плеер отключён в кино и вложенных страницах', () => {
  assert.equal(isPlayerDisabledPath('/cinema'), true);
  assert.equal(isPlayerDisabledPath('/cinema/watch/123'), true);
  assert.equal(isPlayerDisabledPath('/redirect'), true);
  assert.equal(isPlayerDisabledPath('/pay/order-1'), true);
});

test('плеер включён на остальных страницах', () => {
  assert.equal(isPlayerDisabledPath('/'), false);
  assert.equal(isPlayerDisabledPath('/pulse'), false);
  assert.equal(isPlayerDisabledPath('/cinemas'), false);
  assert.equal(isPlayerDisabledPath('/redirection'), false);
  assert.equal(isPlayerDisabledPath('/payments'), false);
  assert.equal(isPlayerDisabledPath(null), false);
});

test('во время звонка плеер приостанавливается, а не выгружается', () => {
  assert.equal(isPlayerSuspendedPath('/call/abc'), true);
  assert.equal(isPlayerSuspendedPath('/call/group/abc'), true);
  assert.equal(isPlayerSuspendedPath('/calls'), false);
  assert.equal(isPlayerSuspendedPath('/pulse'), false);
  assert.equal(isPlayerDisabledPath('/call/abc'), false);
});
