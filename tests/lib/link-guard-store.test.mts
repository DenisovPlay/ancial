import assert from 'node:assert/strict';
import test from 'node:test';

import { closeLinkGuard, getLinkGuardSnapshot, openLinkGuard, parseRedirectHref, subscribeLinkGuard } from '../../app/lib/link-guard-store.ts';

test('ссылка проверки достаётся из href /redirect', () => {
  assert.equal(parseRedirectHref('/redirect?link=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1'), 'https://example.com/a?b=1');
  assert.equal(parseRedirectHref('/redirect?link='), null);
  assert.equal(parseRedirectHref('/redirect'), null);
  assert.equal(parseRedirectHref('/feed?link=https%3A%2F%2Fa.b'), null);
  assert.equal(parseRedirectHref(null), null);
});

test('окно проверки открывается и закрывается с уведомлением подписчиков', () => {
  let calls = 0;
  const off = subscribeLinkGuard(() => { calls += 1; });
  openLinkGuard('https://example.com');
  assert.equal(getLinkGuardSnapshot(), 'https://example.com');
  closeLinkGuard();
  assert.equal(getLinkGuardSnapshot(), null);
  closeLinkGuard();
  assert.equal(calls, 2);
  off();
});
