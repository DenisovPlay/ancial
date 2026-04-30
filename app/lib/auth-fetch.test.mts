import assert from 'node:assert/strict';
import test from 'node:test';

import { withAuthToken } from './auth-fetch.ts';

test('withAuthToken appends local token to legacy PHP API URLs', () => {
  assert.equal(
    withAuthToken('/api/messages/dialogs.php', 'secret token'),
    '/api/messages/dialogs.php?token=secret+token',
  );
});

test('withAuthToken preserves existing query params and hashes', () => {
  assert.equal(
    withAuthToken('/api/messages/dialog.php?di_id=42&limit=30#bottom', 'abc'),
    '/api/messages/dialog.php?di_id=42&limit=30&token=abc#bottom',
  );
});

test('withAuthToken does not override explicit tokens', () => {
  assert.equal(
    withAuthToken('/api/user/info.php?token=explicit', 'stored'),
    '/api/user/info.php?token=explicit',
  );
});

test('withAuthToken appends token to legacy engine URLs', () => {
  assert.equal(
    withAuthToken('/engine/modules/msg/sendmsg.php?di_id=7', 'abc'),
    '/engine/modules/msg/sendmsg.php?di_id=7&token=abc',
  );
});

test('withAuthToken leaves non-legacy URLs untouched', () => {
  assert.equal(withAuthToken('/api/7tv/search?q=test', 'abc'), '/api/7tv/search?q=test');
  assert.equal(withAuthToken('https://api.imgbb.com/1/upload', 'abc'), 'https://api.imgbb.com/1/upload');
});
