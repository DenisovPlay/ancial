import assert from 'node:assert/strict';
import test from 'node:test';

import { matchAutoLink } from '../../app/lib/auto-link.ts';
import { isKnownTld, isPlausibleBareDomain } from '../../app/lib/domain-tld.ts';

test('настоящие домены принимаются на любом языке', () => {
  for (const host of ['zypo.cc', 'vk.com/ancial', 't.me/@zypocc', 'пример.рф', 'сайт.онлайн', 'Zypo.CC', 'a-b.co.uk', 'bücher.de', 'xn--e1afmkfd.xn--p1ai', 'яндекс.рф/search']) {
    assert.equal(isPlausibleBareDomain(host), true, host);
  }
});

test('предложение без пробела после точки — не адрес', () => {
  for (const text of ['звуке.Мелкие', 'end.Next', 'слове.Рус', 'всё.Да', 'ok.Fine', 'Привет.мир', 'готово.ура', 'file.', 'a.b']) {
    assert.equal(isPlausibleBareDomain(text), false, text);
  }
});

test('имена файлов без схемы — не адрес, со схемой — адрес', () => {
  assert.equal(isPlausibleBareDomain('README.md'), false);
  assert.equal(isPlausibleBareDomain('setup.sh'), false);
  assert.equal(isPlausibleBareDomain('https://example.internal/x'), true);
  assert.equal(isPlausibleBareDomain('https://звуке.Мелкие'), true);
});

test('автоссылка редактора не срабатывает на склеенные предложения', () => {
  assert.equal(matchAutoLink('звуке.Мелкие'), null);
  assert.equal(matchAutoLink('звуке.мелкие'), null);
  assert.deepEqual(matchAutoLink('пример.рф'), { href: 'https://пример.рф', length: 9 });
  assert.deepEqual(matchAutoLink('https://zypo.cc/x'), { href: 'https://zypo.cc/x', length: 17 });
});

test('список зон', () => {
  assert.equal(isKnownTld('рф'), true);
  assert.equal(isKnownTld('COM'), true);
  assert.equal(isKnownTld('Мелкие'), false);
});
