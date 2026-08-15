import assert from 'node:assert/strict';

import { resolveCommunityChatAccess, resolveSlowModeRemaining } from './community-chat-access.ts';

const regularCommunityMember = resolveCommunityChatAccess({
  communityId: 42,
  permissions: {
    add_reactions: true,
    connect_voice: true,
    send_messages: true,
  },
});

assert.equal(regularCommunityMember.canSendMessages, true);
assert.equal(regularCommunityMember.canAddReactions, true);
assert.equal(regularCommunityMember.canConnectVoice, true);
assert.equal(regularCommunityMember.canManageMembers, false);

const readOnlyModerator = resolveCommunityChatAccess({
  communityId: 42,
  readOnly: true,
  permissions: { manage_messages: true, send_messages: true },
});
assert.equal(readOnlyModerator.canSendMessages, true);
assert.equal(readOnlyModerator.canDeleteAnyMessage, true);

const mutedAdministrator = resolveCommunityChatAccess({
  activeMute: true,
  communityId: 42,
  readOnly: true,
  permissions: { manage_messages: true, send_messages: true },
});
assert.equal(mutedAdministrator.canSendMessages, false);

const legacyAdmin = resolveCommunityChatAccess({
  communityId: null,
  legacyCanManageInvites: true,
  legacyRole: 'admin',
});
assert.equal(legacyAdmin.canManageChannel, true);
assert.equal(legacyAdmin.canManageMembers, true);
assert.equal(legacyAdmin.canSendMessages, true);

assert.equal(resolveSlowModeRemaining({ lastMessageAtMs: 10_000, nowMs: 15_000, slowModeSeconds: 10 }), 5);
assert.equal(resolveSlowModeRemaining({ lastMessageAtMs: 10_000, nowMs: 21_000, slowModeSeconds: 10 }), 0);

console.log('community chat access: ok');
