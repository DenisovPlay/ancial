import assert from 'node:assert/strict';
import test from 'node:test';

import { classifySearchInput, parseSearchTab, searchHref } from '../../app/lib/search-query.ts';

test('вкладка: неизвестное значение — «Интернет»', () => {
  assert.equal(parseSearchTab('images'), 'images');
  assert.equal(parseSearchTab('hack'), 'web');
  assert.equal(parseSearchTab(null), 'web');
});

test('адрес результатов: запрос кодируется, вкладка по умолчанию не пишется', () => {
  assert.equal(searchHref('кот и пёс'), '/?q=%D0%BA%D0%BE%D1%82+%D0%B8+%D0%BF%D1%91%D1%81');
  assert.equal(searchHref(' zypo ', 'music'), '/?q=zypo&tab=music');
  assert.equal(searchHref('x'.repeat(300)).length < 260, true);
});

test('строка поиска: пустая, запрос или адрес сайта', () => {
  assert.deepEqual(classifySearchInput('   '), { kind: 'empty' });
  assert.deepEqual(classifySearchInput(' погода '), { kind: 'query', query: 'погода' });
  assert.deepEqual(classifySearchInput('www.zypo.cc'), { kind: 'url', url: 'https://www.zypo.cc' });
  assert.deepEqual(classifySearchInput('http://a.b/c'), { kind: 'url', url: 'http://a.b/c' });
  assert.deepEqual(classifySearchInput('example.com/pulse'), { kind: 'url', url: 'https://example.com/pulse' });
  assert.equal(classifySearchInput('как дела.com ты').kind, 'query');
});
