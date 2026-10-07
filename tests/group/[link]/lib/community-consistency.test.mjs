import assert from 'node:assert/strict';

import {
  canManageCommunityMember,
  canManageCommunityRole,
  visibleManagementTabs,
} from './community-types.ts';

assert.deepEqual(visibleManagementTabs({ manage_roles: true }), ['roles', 'members']);
assert.deepEqual(visibleManagementTabs({ manage_members: true }), ['members']);

assert.equal(canManageCommunityMember({ actorIsOwner: false, actorPosition: 50, targetIsOwner: false, targetPosition: 100 }), true);
assert.equal(canManageCommunityMember({ actorIsOwner: false, actorPosition: 100, targetIsOwner: false, targetPosition: 50 }), false);
assert.equal(canManageCommunityMember({ actorIsOwner: true, actorPosition: -1, targetIsOwner: true, targetPosition: -1 }), false);

assert.equal(canManageCommunityRole({ actorIsOwner: false, actorPosition: 50, roleIsSystem: true, rolePosition: 100 }), false);
assert.equal(canManageCommunityRole({ actorIsOwner: true, actorPosition: -1, roleIsSystem: true, rolePosition: 10 }), true);
assert.equal(canManageCommunityRole({ actorIsOwner: false, actorPosition: 50, roleIsSystem: false, rolePosition: 100 }), true);

console.log('community consistency helpers: ok');
