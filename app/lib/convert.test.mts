import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Тесты общих конвертеров app/lib/convert.ts.
 *
 * decodeHtmlEntities использует DOM-textarea (нужен document) — в Node
 * поднимаем jsdom до импорта модуля. В браузере тот же путь; на сервере
 * (нет document) функция возвращает строку как есть (SSR passthrough).
 */

const { JSDOM } = await import('jsdom');
const { window } = new JSDOM('');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsdom-Window не совпадает с типом globalThis
(globalThis as any).window = window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. выше
(globalThis as any).document = window.document;

const { coerceToFinite, parseToInt, normalizeText, decodeHtmlEntities } = await import('./convert.ts');

test('coerceToFinite: строка → число', () => {
    assert.equal(coerceToFinite('123'), 123);
    assert.equal(coerceToFinite('12.5'), 12.5);
    assert.equal(coerceToFinite('-7'), -7);
});

test('coerceToFinite: null/undefined/мусор → fallback', () => {
    assert.equal(coerceToFinite(null), 0);
    assert.equal(coerceToFinite(undefined), 0);
    assert.equal(coerceToFinite('abc'), 0);
    assert.equal(coerceToFinite('abc', 5), 5);
    assert.equal(coerceToFinite(Infinity), 0, 'Infinity не является finite');
});

test('parseToInt: обрезает мусорный хвост', () => {
    assert.equal(parseToInt('12abc'), 12);
    assert.equal(parseToInt('42'), 42);
    assert.equal(parseToInt(null), 0);
    assert.equal(parseToInt(undefined), 0);
});

test('normalizeText: приведение к чистой строке с trim', () => {
    assert.equal(normalizeText('  hi  '), 'hi');
    assert.equal(normalizeText(null), '');
    assert.equal(normalizeText(undefined), '');
    assert.equal(normalizeText(42), '42');
});

test('decodeHtmlEntities: HTML-сущности раскрываются через textarea', () => {
    assert.equal(decodeHtmlEntities('&lt;b&gt;'), '<b>');
    assert.equal(decodeHtmlEntities('a&amp;b'), 'a&b');
    assert.equal(decodeHtmlEntities('&#39;quote&#39;'), "'quote'");
});

test('decodeHtmlEntities: SSR passthrough без window', () => {
    const w = globalThis.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- имитация SSR-окружения
    (globalThis as any).window = undefined;
    try {
        assert.equal(decodeHtmlEntities('&amp;'), '&amp;', 'без window строка возвращается как есть');
    } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- восстановление после имитации SSR
        (globalThis as any).window = w;
    }
});
