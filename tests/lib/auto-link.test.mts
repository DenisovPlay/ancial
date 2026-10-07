import assert from 'node:assert/strict';
import test from 'node:test';

import { findTokenBounds, matchAutoLink } from '../../app/lib/auto-link.ts';

test('ссылки распознаются сразу, как только слово стало адресом', () => {
  assert.deepEqual(matchAutoLink('vk.com/ancial'), { href: 'https://vk.com/ancial', length: 13 });
  assert.deepEqual(matchAutoLink('zypo.cc'), { href: 'https://zypo.cc', length: 7 });
  assert.deepEqual(matchAutoLink('https://zypo.cc/groups?x=1#a'), { href: 'https://zypo.cc/groups?x=1#a', length: 28 });
  assert.deepEqual(matchAutoLink('t.me/@zypocc'), { href: 'https://t.me/@zypocc', length: 12 });
  assert.deepEqual(matchAutoLink('user@mail.com'), { href: 'mailto:user@mail.com', length: 13 });
});

test('пока адрес не дописан — это не ссылка', () => {
  assert.equal(matchAutoLink('zypo'), null);
  assert.equal(matchAutoLink('zypo.'), null);
  assert.equal(matchAutoLink('zypo.c'), null);
  assert.equal(matchAutoLink('привет'), null);
  assert.equal(matchAutoLink('3.14'), null);
});

test('знаки препинания в конце не входят в ссылку', () => {
  assert.deepEqual(matchAutoLink('example.com,'), { href: 'https://example.com', length: 11 });
  assert.deepEqual(matchAutoLink('example.com/a.'), { href: 'https://example.com/a', length: 13 });
});

test('имена файлов без схемы ссылками не считаются', () => {
  assert.equal(matchAutoLink('index.html'), null);
  assert.equal(matchAutoLink('app.js'), null);
  assert.deepEqual(matchAutoLink('https://x.com/app.js'), { href: 'https://x.com/app.js', length: 20 });
});

test('границы слова вокруг курсора', () => {
  const text = 'смотри zypo.cc/groups тут';
  assert.deepEqual(findTokenBounds(text, 10), { end: 21, start: 7 });
  assert.deepEqual(findTokenBounds(text, 21), { end: 21, start: 7 });
  assert.deepEqual(findTokenBounds(text, 6), { end: 6, start: 0 });
  assert.equal(findTokenBounds('a  b', 2), null);
  assert.deepEqual(findTokenBounds('(zypo.cc)', 5), { end: 9, start: 1 });
});
