import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOptimizedImageSrc, decodeHtmlAttribute, getOriginalImageSrc } from './optimized-image-src.ts';

test('optimized src round-trips to the original url', () => {
  const original = 'https://i.imgur.com/abc.jpg?x=1&y=2';
  const attr = buildOptimizedImageSrc(original, 1080);
  assert.ok(attr.startsWith('/_next/image?url='));
  // В атрибуте & экранированы, браузер отдаёт img.src уже без них.
  const asBrowserSees = `https://zypo.cc${decodeHtmlAttribute(attr)}`;
  assert.equal(getOriginalImageSrc(asBrowserSees), original);
  assert.ok(asBrowserSees.includes('w=1080') && asBrowserSees.includes('q=75'));
});

test('non-optimizer urls are returned as is', () => {
  assert.equal(getOriginalImageSrc('https://i.ibb.co/x.png'), 'https://i.ibb.co/x.png');
  assert.equal(getOriginalImageSrc('/img/pic.webp'), '/img/pic.webp');
  assert.equal(getOriginalImageSrc(''), '');
});

test('server-escaped attribute values are decoded', () => {
  assert.equal(decodeHtmlAttribute('https://a.b/c?x=1&amp;y=&quot;2&quot;'), 'https://a.b/c?x=1&y="2"');
});
