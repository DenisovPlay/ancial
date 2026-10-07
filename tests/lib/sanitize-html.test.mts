import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Тесты центрального санитайзера пользовательского HTML.
 *
 * sanitizeUserHtml зависит от DOMPurify (нужен DOM) — в Node используем
 * jsdom: глобальный window должен быть выставлен ДО импорта модуля,
 * т.к. DOMPurify привязывается к window при загрузке.
 */

const { JSDOM } = await import('jsdom');
const { window } = new JSDOM('');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsdom-Window не совпадает с типом globalThis
(globalThis as any).window = window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. выше
(globalThis as any).document = window.document;

const { sanitizeUserHtml } = await import('./sanitize-html.ts');

test('вырезает script и обработчики событий', () => {
    const dirty = '<p>ok</p><script>alert(1)<\/script><img src="/x.png" onerror="alert(2)">';
    const clean = sanitizeUserHtml(dirty);
    assert.ok(!clean.includes('<script'), 'script должен быть удалён');
    assert.ok(!clean.includes('onerror'), 'onerror должен быть удалён');
    assert.ok(clean.includes('<p>ok</p>'), 'легитимное содержимое сохраняется');
});

test('вырезает javascript:-URL из href', () => {
    const clean = sanitizeUserHtml('<a href="javascript:alert(1)">x</a>');
    assert.ok(!clean.toLowerCase().includes('javascript:'));
});

test('вырезает iframe и style-атрибуты', () => {
    const clean = sanitizeUserHtml('<iframe src="https://evil.example"></iframe><span style="position:fixed">t</span>');
    assert.ok(!clean.includes('<iframe'));
    assert.ok(!clean.includes('style='));
});

test('сохраняет легитимную разметку постов', () => {
    const html = [
        '<h2 class="text-2xl">Заголовок</h2>',
        '<blockquote class="border-l-4" data-author="Кто-то">цитата</blockquote>',
        '<table class="w-full"><tr><td class="border">1</td></tr></table>',
        '<img src="/img/stickers/webp/classic.webp" alt=":classic:" loading="lazy">',
        '<a href="/redirect?link=x" target="_blank" rel="noopener" class="text-purple-500">@user</a>',
        '<button type="button" data-action="edit" data-type="table" contenteditable="false">E</button>',
        '<div data-bbcode="%5Btable%5D" contenteditable="false"></div>',
    ].join('');
    const clean = sanitizeUserHtml(html);
    const mustKeep = [
        '<h2 class="text-2xl">',
        '<blockquote class="border-l-4"',
        '<table class="w-full">',
        '<td class="border">',
        '<img src="/img/stickers/webp/classic.webp"',
        '<a href="/redirect?link=x"',
        '<button type="button" data-action="edit"',
        'data-bbcode',
    ];
    for (const part of mustKeep) {
        assert.ok(clean.includes(part), `должно сохраниться: ${part}`);
    }
});

test('сохраняет стикеры с data-sticker и data-clipboard-text', () => {
    const html = '<span class="inline-sticker-wrapper" data-sticker="classic" contenteditable="false"><img src="/img/stickers/webp/classic.webp" data-clipboard-text=":classic:" alt=":classic:"></span>';
    const clean = sanitizeUserHtml(html);
    assert.ok(clean.includes('data-sticker="classic"'));
    assert.ok(clean.includes('data-clipboard-text=":classic:"'));
});

test('сохраняет карусельные стрелки без onclick', () => {
    const clean = sanitizeUserHtml('<button type="button" data-carousel-scroll="-1" aria-label="Назад" class="absolute left-3">←</button>');
    assert.ok(clean.includes('data-carousel-scroll="-1"'));
    assert.ok(!clean.toLowerCase().includes('onclick'));
});

test('svg-иконки тулбара редактора сохраняются', () => {
    const clean = sanitizeUserHtml('<button type="button"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="#IC-edit"></use></svg></button>');
    assert.ok(clean.includes('<svg'), 'svg должен сохраниться');
    assert.ok(clean.includes('viewbox') || clean.includes('viewBox'), 'viewBox должен сохраниться');
    assert.ok(clean.includes('#IC-edit'), 'use href должен сохраниться');
});

test('preloadImages помечает картинки прелоадером, по умолчанию — нет', () => {
    const html = '<p>x</p><img src="/img/a.webp" class="w-10 rounded-full">';
    const plain = sanitizeUserHtml(html);
    assert.ok(!plain.includes('data-zimg'), 'без опции разметка не меняется (редактор)');
    assert.ok(!plain.includes('img-skeleton'));

    const marked = sanitizeUserHtml(html, { preloadImages: true });
    assert.ok(marked.includes('data-zimg'), 'маркер делегирования сохраняется');
    assert.ok(marked.includes('img-skeleton') && marked.includes('img-loading'));
    assert.ok(marked.includes('w-10') && marked.includes('rounded-full'), 'свои классы картинки не теряются');

    // Флаг не «протекает» на следующий вызов.
    assert.ok(!sanitizeUserHtml(html).includes('data-zimg'));
});

test('preloadImages не трогает SVG', () => {
    const marked = sanitizeUserHtml('<img src="/img/branding/7tv.svg?id=-1" class="h-5"><img src="/img/a.webp">', { preloadImages: true });
    const [svgTag, rasterTag] = marked.split('<img').slice(1);
    assert.ok(!svgTag.includes('img-skeleton') && !svgTag.includes('data-zimg'), 'у svg нет прелоадера');
    assert.ok(rasterTag.includes('img-skeleton'), 'у растровой картинки прелоадер есть');
});
