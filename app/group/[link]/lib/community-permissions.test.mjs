import assert from 'node:assert/strict';
import {
  COMMUNITY_CHANNEL_RENDERERS,
  COMMUNITY_CHANNEL_PERMISSION_NAMES,
  canCommunity,
  communityErrorKey,
  communityEventMatches,
  COMMUNITY_INVALIDATION_DELAY_MS,
  retainCommunityChannelSelection,
  visibleManagementTabs,
} from './community-types.ts';

assert.equal(canCommunity({ manage_channels: true }, 'manage_channels'), true);
assert.equal(canCommunity({}, 'manage_channels'), false);
assert.deepEqual(visibleManagementTabs({ manage_community: true }), ['community']);
assert.deepEqual(visibleManagementTabs({ manage_roles: true }), ['roles']);
assert.deepEqual(
  visibleManagementTabs({
    manage_community: true, manage_channels: true,
    manage_roles: true,
    manage_members: true,
    view_audit_log: true,
  }),
  ['community', 'channels', 'roles', 'members', 'link_requests', 'audit'],
);
assert.deepEqual(visibleManagementTabs({}), []);
assert.deepEqual(Object.keys(COMMUNITY_CHANNEL_RENDERERS), ['text']);
assert.deepEqual(COMMUNITY_CHANNEL_PERMISSION_NAMES, [
  'view_channel', 'send_messages', 'add_reactions', 'mention_everyone',
  'connect_voice', 'speak_voice', 'manage_messages', 'manage_voice',
]);
assert.equal(communityErrorKey(403), 'community_permission_error');
assert.equal(communityErrorKey(409), 'community_stale_error');
assert.equal(communityErrorKey(500), 'community_save_error');
assert.equal(communityEventMatches({ community_id: 7 }, 7), true);
assert.equal(communityEventMatches({ data: { community_id: '7' } }, 7), true);
assert.equal(communityEventMatches({ community_id: 8 }, 7), false);
assert.equal(retainCommunityChannelSelection([{ id: 2 }, { id: 3 }], 3), 3);
assert.equal(retainCommunityChannelSelection([{ id: 2 }], 3), 2);
assert.equal(retainCommunityChannelSelection([], 3), null);
assert.equal(COMMUNITY_INVALIDATION_DELAY_MS, 150);

console.log('community client permissions: ok');
