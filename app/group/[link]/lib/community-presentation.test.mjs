import assert from 'node:assert/strict';

import {
  communityChannelIconId,
  communityChannelTypeLabel,
  formatCommunityAuditDate,
} from './community-presentation.ts';

assert.equal(communityChannelIconId('text'), 'IC-chats');

assert.equal(
  communityChannelTypeLabel('text', {
    text: 'Текстовый канал',
  }),
  'Текстовый канал',
);

assert.equal(formatCommunityAuditDate('not-a-date', 'ru'), 'not-a-date');
assert.match(formatCommunityAuditDate('2026-08-12T10:30:00Z', 'en'), /2026/);

console.log('community presentation: ok');
