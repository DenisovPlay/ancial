import assert from 'node:assert/strict';
import test from 'node:test';

import { toInternalPath } from './internal-link.ts';

test('ссылки на свой домен превращаются в путь', () => {
  assert.equal(toInternalPath('https://zypo.cc'), '/');
  assert.equal(toInternalPath('https://zypo.cc/feed/post/5?x=1#c'), '/feed/post/5?x=1#c');
  assert.equal(toInternalPath('http://www.zypo.cc/pulse'), '/pulse');
  assert.equal(toInternalPath('ZYPO.cc/settings'), '/settings');
  assert.equal(toInternalPath('/messages/abc'), '/messages/abc');
});

test('чужие и подделанные домены внутренними не считаются', () => {
  assert.equal(toInternalPath('https://zypo.cc.evil.com'), null);
  assert.equal(toInternalPath('https://evil.com/zypo.cc'), null);
  assert.equal(toInternalPath('https://zypo.cc@evil.com'), null);
  assert.equal(toInternalPath('https://user:pw@zypo.cc'), null);
  assert.equal(toInternalPath('https://zypo.cc:8443/x'), null);
  assert.equal(toInternalPath('https://api.zypo.cc/x'), null);
  assert.equal(toInternalPath('https://notzypo.cc'), null);
});

test('протокол-относительные, служебные схемы и мусор — не внутренние', () => {
  assert.equal(toInternalPath('//evil.com'), null);
  assert.equal(toInternalPath('/\\evil.com'), null);
  assert.equal(toInternalPath('javascript:alert(1)'), null);
  assert.equal(toInternalPath('data:text/html,x'), null);
  assert.equal(toInternalPath(''), null);
});
