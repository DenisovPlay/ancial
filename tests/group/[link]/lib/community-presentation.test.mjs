import assert from 'node:assert/strict';

import {
  communityChannelIconId,
  communityChannelTypeLabel,
  communityAuditActionLabel,
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
assert.equal(
  communityAuditActionLabel('channel.delete', { community_audit_action_channel_delete: 'Канал удалён' }),
  'Канал удалён',
);
assert.equal(
  communityAuditActionLabel('future.some_action', {}),
  'Future some action',
);

console.log('community presentation: ok');
