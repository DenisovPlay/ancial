import test from 'node:test';
import assert from 'node:assert/strict';
import { parseServerDate, formatRelativeTime } from './time.ts';

test('parseServerDate parses Moscow SQL datetimes correctly', () => {
  const date = parseServerDate('2026-08-27 18:00:00');
  assert.ok(date instanceof Date);
  assert.equal(date.toISOString(), '2026-08-27T15:00:00.000Z');
});

test('parseServerDate handles numeric timestamps and ISO strings', () => {
  const ts = 1756306800; // seconds
  const date1 = parseServerDate(ts);
  assert.ok(date1 instanceof Date);
  assert.equal(date1.getTime(), ts * 1000);

  const iso = '2026-08-27T15:00:00.000Z';
  const date2 = parseServerDate(iso);
  assert.ok(date2 instanceof Date);
  assert.equal(date2.toISOString(), iso);
});

test('formatRelativeTime formats relative time with localized keys', () => {
  const now = new Date();
  const mockRuLang = {
    now: 'только что',
    h: 'ч',
    ago: 'назад',
    d: 'дн',
  };
  const mockEnLang = {
    now: 'just now',
    h: 'h',
    ago: 'ago',
    d: 'd',
  };

  // Recent (<60s)
  assert.equal(formatRelativeTime(now, mockRuLang), 'только что');
  assert.equal(formatRelativeTime(now, mockEnLang), 'just now');

  // 2 hours ago
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
  assert.equal(formatRelativeTime(twoHoursAgo, mockRuLang), '2 ч назад');
  assert.equal(formatRelativeTime(twoHoursAgo, mockEnLang), '2 h ago');

  // 3 days ago
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400 * 1000);
  assert.equal(formatRelativeTime(threeDaysAgo, mockRuLang), '3 дн назад');
  assert.equal(formatRelativeTime(threeDaysAgo, mockEnLang), '3 d ago');
});
