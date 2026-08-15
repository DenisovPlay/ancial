import type { CommunityPermissionMap } from '../../group/[link]/lib/community-types';

type CommunityChatAccessInput = {
  activeMute?: boolean;
  communityId?: number | string | null;
  legacyCanManageInvites?: boolean;
  legacyRole?: string | null;
  permissions?: CommunityPermissionMap | null;
  readOnly?: boolean;
};

export type CommunityChatAccess = {
  canAddReactions: boolean;
  canConnectVoice: boolean;
  canDeleteAnyMessage: boolean;
  canManageChannel: boolean;
  canManageInvites: boolean;
  canManageJoinRequests: boolean;
  canManageMembers: boolean;
  canManageRoles: boolean;
  canManageVoice: boolean;
  canSendMessages: boolean;
  isCommunityChannel: boolean;
};

export function resolveCommunityChatAccess({
  activeMute = false,
  communityId,
  legacyCanManageInvites = false,
  legacyRole,
  permissions,
  readOnly = false,
}: CommunityChatAccessInput): CommunityChatAccess {
  const isCommunityChannel = Number(communityId || 0) > 0;
  if (!isCommunityChannel) {
    const isLegacyManager = legacyRole === 'owner' || legacyRole === 'admin';
    return {
      canAddReactions: true,
      canConnectVoice: true,
      canDeleteAnyMessage: false,
      canManageChannel: isLegacyManager,
      canManageInvites: legacyCanManageInvites || isLegacyManager,
      canManageJoinRequests: isLegacyManager,
      canManageMembers: isLegacyManager,
      canManageRoles: false,
      canManageVoice: isLegacyManager,
      canSendMessages: true,
      isCommunityChannel: false,
    };
  }

  const canDeleteAnyMessage = permissions?.manage_messages === true;
  return {
    canAddReactions: permissions?.add_reactions === true,
    canConnectVoice: permissions?.connect_voice === true,
    canDeleteAnyMessage,
    canManageChannel: permissions?.manage_channels === true,
    canManageInvites: permissions?.manage_invites === true,
    canManageJoinRequests: permissions?.manage_join_requests === true,
    canManageMembers: permissions?.manage_members === true,
    canManageRoles: permissions?.manage_roles === true,
    canManageVoice: permissions?.manage_voice === true,
    canSendMessages: !activeMute
      && permissions?.send_messages === true
      && (!readOnly || canDeleteAnyMessage),
    isCommunityChannel: true,
  };
}

export function resolveSlowModeRemaining({
  lastMessageAtMs,
  nowMs,
  slowModeSeconds,
}: {
  lastMessageAtMs: number | null;
  nowMs: number;
  slowModeSeconds: number;
}) {
  if (!lastMessageAtMs || slowModeSeconds <= 0) return 0;
  return Math.max(0, Math.ceil((lastMessageAtMs + slowModeSeconds * 1000 - nowMs) / 1000));
}
