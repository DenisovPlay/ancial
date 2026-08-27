import test from 'node:test';
import assert from 'node:assert/strict';
import { locales, availableLocales, isSupportedLang, resolveLocaleDict, getStoredLangCode } from './index.ts';

test('locales contains ru and en', () => {
  assert.ok(locales.ru, 'ru dictionary should be defined');
  assert.ok(locales.en, 'en dictionary should be defined');
  assert.equal(locales.ru.langname, 'ru');
  assert.equal(locales.en.langname, 'en');
});

test('availableLocales dynamically extracts code and title', () => {
  assert.ok(Array.isArray(availableLocales));
  assert.ok(availableLocales.length >= 2);

  const ruLocale = availableLocales.find((l) => l.code === 'ru');
  assert.ok(ruLocale);
  assert.equal(ruLocale.code, 'ru');
  assert.equal(ruLocale.title, locales.ru.langtitle);

  const enLocale = availableLocales.find((l) => l.code === 'en');
  assert.ok(enLocale);
  assert.equal(enLocale.code, 'en');
  assert.equal(enLocale.title, locales.en.langtitle);
});

test('isSupportedLang validates language codes', () => {
  assert.equal(isSupportedLang('ru'), true);
  assert.equal(isSupportedLang('en'), true);
  assert.equal(isSupportedLang('invalid_code_123'), false);
  assert.equal(isSupportedLang(null), false);
  assert.equal(isSupportedLang(undefined), false);
});

test('resolveLocaleDict returns corresponding dictionary or fallback ru', () => {
  assert.equal(resolveLocaleDict('en'), locales.en);
  assert.equal(resolveLocaleDict('ru'), locales.ru);
  assert.equal(resolveLocaleDict('unknown'), locales.ru);
  assert.equal(resolveLocaleDict(undefined), locales.ru);
});
