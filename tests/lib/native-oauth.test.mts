import test from 'node:test';
import assert from 'node:assert/strict';

import { buildNativeOAuthUrl, dispatchNativeOAuthReturn } from './native-oauth.ts';

test('Яндекс: возврат на Yandex.php?mode=app с state и challenge, без секрета', () => {
  const url = new URL(buildNativeOAuthUrl('yandex', 'st4te', 'ab'.repeat(32)));
  assert.equal(url.origin, 'https://oauth.yandex.ru');
  assert.equal(url.searchParams.get('response_type'), 'token');
  assert.equal(url.searchParams.get('state'), 'st4te');
  const redirect = new URL(url.searchParams.get('redirect_uri') ?? '');
  assert.equal(redirect.pathname, '/api/V2/oauth/Yandex.php');
  assert.equal(redirect.searchParams.get('mode'), 'app');
  assert.equal(redirect.searchParams.get('state'), 'st4te');
  assert.equal(redirect.searchParams.get('challenge'), 'ab'.repeat(32));
});

test('Telegram: oauth.telegram.org с origin сайта и return_to на Telegram.php?mode=app', () => {
  const url = new URL(buildNativeOAuthUrl('telegram', 's', 'cd'.repeat(32)));
  assert.equal(url.origin, 'https://oauth.telegram.org');
  assert.equal(url.searchParams.get('origin'), 'https://zypo.cc');
  const returnTo = new URL(url.searchParams.get('return_to') ?? '');
  assert.equal(returnTo.origin, 'https://zypo.cc');
  assert.equal(returnTo.pathname, '/api/V2/oauth/Telegram.php');
  assert.equal(returnTo.searchParams.get('challenge'), 'cd'.repeat(32));
});

test('ссылка возврата cc.zypo.app://oauth превращается в событие, остальные — нет', () => {
  const target = new EventTarget();
  (globalThis as { window?: EventTarget }).window = target;
  const received: unknown[] = [];
  target.addEventListener('zypo:native-oauth-return', (event) => received.push((event as CustomEvent).detail));

  assert.equal(dispatchNativeOAuthReturn('cc.zypo.app://oauth?provider=yandex&state=abc&status=ok'), true);
  assert.equal(dispatchNativeOAuthReturn('cc.zypo.app://pulse/track/1'), false);
  assert.equal(dispatchNativeOAuthReturn('https://zypo.cc/oauth?state=abc'), false);
  assert.deepEqual(received, [{ provider: 'yandex', state: 'abc', status: 'ok' }]);
});
