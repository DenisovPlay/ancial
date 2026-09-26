import test from 'node:test';
import assert from 'node:assert/strict';

import { isBackendPath, toBackendUrl } from './api-url.ts';

test('backend paths go straight to the backend in the app', () => {
  assert.equal(toBackendUrl('/api/V2/auth/CheckStatus.php'), 'https://backend.ru.zypo.cc/api/V2/auth/CheckStatus.php');
  assert.equal(toBackendUrl('/image.php?id=5'), 'https://backend.ru.zypo.cc/image.php?id=5');
  assert.equal(toBackendUrl('/includes/img/x.png'), 'https://backend.ru.zypo.cc/includes/img/x.png');
});

test('app pages and bundle files stay local', () => {
  assert.equal(isBackendPath('/img/pulse/track.png'), false);
  assert.equal(isBackendPath('/apps/included/weather'), false);
  assert.equal(isBackendPath('/apps/included/weather/map'), false);
  assert.equal(isBackendPath('/apps/included/bingo/app.js'), true);
  assert.equal(isBackendPath('//evil.example/api/x'), false);
  assert.equal(isBackendPath('https://imgur.com/a.png'), false);
});
