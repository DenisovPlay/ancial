import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dayBucket,
  formatCountdown,
  groupNotificationsByDay,
  matchesFilter,
  notificationHref,
  notificationSegments,
  secondsLeft,
  translateLegacyContent,
} from './kinds.ts';
import type { RichNotification } from './types.ts';

const base: RichNotification = {
  actions: [], actor_count: 1, actors: [{ id: 5, img: '', name: 'Иван', type: 'user', username: 'ivan', verify: 0 }],
  content: 'Иван оставил(а) комментарий к вашему посту', count: 1, date: null, id: 1, kind: 'comment_post', object: null,
  params: {}, read: false, secret: null, sender_id: 5, target_id: 9, ts: '2026-10-01T12:00:00+03:00', type: 3, url: '/feed/post/9?comment=3',
};

const flat = (segments: ReturnType<typeof notificationSegments>) => segments.map((s) => s.text).join('');

test('текст собирается по шаблону, имя актёра — жирным сегментом', () => {
  const segments = notificationSegments(base, {});
  assert.deepEqual(segments[0], { bold: true, text: 'Иван' });
  assert.equal(flat(segments), 'Иван оставил(а) комментарий к вашему посту');
});

test('группа: «и ещё N» берётся из счётчика событий или людей по виду', () => {
  assert.equal(flat(notificationSegments({ ...base, count: 4, actor_count: 2 }, {})), 'Иван и ещё 3 прокомментировали ваш пост');
  const vote = { ...base, kind: 'post_vote', count: 13, actor_count: 13 };
  assert.equal(flat(notificationSegments(vote, {})), 'Иван и ещё 12 оценили ваш пост');
});

test('словарь приоритетнее запасных шаблонов, параметры подставляются', () => {
  const lang = { notif_group_added: '{name} added you to “{chat}”' };
  const added = { ...base, kind: 'group_added', params: { chat: 'Работа' } };
  assert.equal(flat(notificationSegments(added, lang)), 'Иван added you to “Работа”');
});

test('старые строки переводятся прежними заменами', () => {
  assert.equal(translateLegacyContent('Иван оставил комментарий к вашему посту', 'en'), 'Иван commented on your post');
  const legacy = { ...base, kind: 'legacy', content: 'Анна звонит вам' };
  assert.equal(flat(notificationSegments(legacy, {}, 'be')), 'Анна тэлефануе вам');
});

test('ссылка уведомления — только внутренний путь', () => {
  assert.equal(notificationHref(base), '/feed/post/9?comment=3');
  assert.equal(notificationHref({ url: '//evil.com' }), null);
  assert.equal(notificationHref({ url: 'https://evil.com' }), null);
  assert.equal(notificationHref({ url: '/notifications' }), null);
  assert.equal(notificationHref({ url: null }), null);
});

test('фильтры: Контент / Люди / Безопасность', () => {
  assert.equal(matchesFilter('post_vote', 'content'), true);
  assert.equal(matchesFilter('friend_request', 'people'), true);
  assert.equal(matchesFilter('login_code', 'security'), true);
  assert.equal(matchesFilter('login_code', 'content'), false);
  assert.equal(matchesFilter('wallet_received', 'all'), true);
});

test('секции по дням: сегодня, вчера, ранее', () => {
  const now = new Date(2026, 9, 1, 15, 0);
  assert.equal(dayBucket(new Date(2026, 9, 1, 9, 0).toISOString(), now), 'today');
  assert.equal(dayBucket(new Date(2026, 8, 30, 23, 0).toISOString(), now), 'yesterday');
  assert.equal(dayBucket(new Date(2026, 8, 20).toISOString(), now), 'earlier');
  assert.equal(dayBucket(null, now), 'earlier');
  const sections = groupNotificationsByDay([
    { ...base, id: 3, ts: new Date(2026, 9, 1, 10).toISOString() },
    { ...base, id: 2, ts: new Date(2026, 9, 1, 8).toISOString() },
    { ...base, id: 1, ts: new Date(2026, 8, 25).toISOString() },
  ], now);
  assert.deepEqual(sections.map((s) => [s.bucket, s.items.length]), [['today', 2], ['earlier', 1]]);
});

test('обратный отсчёт кода', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  assert.equal(secondsLeft('2026-10-01T12:04:30Z', now), 270);
  assert.equal(secondsLeft('2026-10-01T11:59:00Z', now), 0);
  assert.equal(secondsLeft(null, now), 0);
  assert.equal(formatCountdown(270), '4:30');
  assert.equal(formatCountdown(65), '1:05');
});
