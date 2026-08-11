import assert from 'node:assert/strict';
import {
  COMMUNITY_CHANNEL_RENDERERS,
  canCommunity,
  communityErrorKey,
  visibleManagementTabs,
} from './community-types.ts';

assert.equal(canCommunity({ manage_channels: true }, 'manage_channels'), true);
assert.equal(canCommunity({}, 'manage_channels'), false);
assert.deepEqual(visibleManagementTabs({ manage_roles: true }), ['roles']);
assert.deepEqual(
  visibleManagementTabs({
    manage_channels: true,
    manage_roles: true,
    manage_members: true,
    view_audit_log: true,
  }),
  ['channels', 'roles', 'members', 'link_requests', 'audit'],
);
assert.deepEqual(visibleManagementTabs({}), []);
assert.deepEqual(Object.keys(COMMUNITY_CHANNEL_RENDERERS).sort(), ['announcement', 'text', 'voice']);
assert.equal(communityErrorKey(403), 'community_permission_error');
assert.equal(communityErrorKey(409), 'community_stale_error');
assert.equal(communityErrorKey(500), 'community_save_error');

console.log('community client permissions: ok');
