import assert from 'node:assert/strict';

import {
  communityChannelIconId,
  communityChannelTypeLabel,
  formatCommunityAuditDate,
} from './community-presentation.ts';

assert.equal(communityChannelIconId('text'), 'IC-chats');
assert.equal(communityChannelIconId('announcement'), 'IC-news');
assert.equal(communityChannelIconId('voice'), 'IC-call');

assert.equal(
  communityChannelTypeLabel('voice', {
    text: 'Текстовый канал',
    announcement: 'Канал объявлений',
    voice: 'Голосовой канал',
  }),
  'Голосовой канал',
);

assert.equal(formatCommunityAuditDate('not-a-date', 'ru'), 'not-a-date');
assert.match(formatCommunityAuditDate('2026-08-12T10:30:00Z', 'en'), /2026/);

console.log('community presentation: ok');
