import test from 'node:test';
import assert from 'node:assert/strict';
import { availableLocales, defaultLocaleDict, isSupportedLang, loadLocaleDict } from './index.ts';

test('словарь по умолчанию — русский, доступен сразу', () => {
  assert.equal(defaultLocaleDict.langname, 'ru');
});

test('названия языков в селекте совпадают с langtitle самих словарей', async () => {
  assert.ok(availableLocales.length >= 3);
  for (const locale of availableLocales) {
    const dict = await loadLocaleDict(locale.code);
    assert.equal(dict.langname, locale.code, `langname у ${locale.code}`);
    assert.equal(dict.langtitle, locale.title, `langtitle у ${locale.code}`);
  }
});

test('isSupportedLang validates language codes', () => {
  assert.equal(isSupportedLang('ru'), true);
  assert.equal(isSupportedLang('en'), true);
  assert.equal(isSupportedLang('be'), true);
  assert.equal(isSupportedLang('invalid_code_123'), false);
  assert.equal(isSupportedLang(null), false);
  assert.equal(isSupportedLang(undefined), false);
});

test('loadLocaleDict: неизвестный код — русский', async () => {
  assert.equal((await loadLocaleDict('en')).langname, 'en');
  assert.equal(await loadLocaleDict('unknown'), defaultLocaleDict);
  assert.equal(await loadLocaleDict(undefined), defaultLocaleDict);
});
