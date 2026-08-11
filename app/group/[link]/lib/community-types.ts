export type CommunityPermissionName =
  | 'manage_community'
  | 'manage_channels'
  | 'manage_roles'
  | 'manage_members'
  | 'manage_messages'
  | 'manage_invites'
  | 'manage_join_requests'
  | 'manage_voice'
  | 'view_channel'
  | 'send_messages'
  | 'attach_files'
  | 'add_reactions'
  | 'connect_voice'
  | 'speak_voice'
  | 'mention_everyone'
  | 'view_audit_log';

export type CommunityPermissionMap = Partial<Record<CommunityPermissionName, boolean>>;
export type CommunityChannelType = 'text' | 'announcement' | 'voice';
export type CommunityManagementTab = 'channels' | 'roles' | 'members' | 'link_requests' | 'audit';

export interface CommunityCategory {
  id: number;
  name: string;
  position: number;
  collapsed_default: boolean;
}

export interface CommunityChannel {
  id: number;
  hash: string;
  title: string;
  description: string | null;
  category_id: number | null;
  channel_type: CommunityChannelType;
  sort_order: number;
  slow_mode_seconds: number;
  read_only: boolean;
  voice_enabled: boolean;
  members_count: number;
  permissions: CommunityPermissionMap;
}

export interface CommunityStructure {
  community_id: number;
  categories: CommunityCategory[];
  channels: CommunityChannel[];
  permissions: CommunityPermissionMap;
  highest_role_position: number | null;
}

export interface CommunityRole {
  id: number;
  name: string;
  color: string;
  position: number;
  permissions: CommunityPermissionMap;
  is_system: boolean;
  system_key: 'administrator' | 'member' | null;
  member_count: number;
}

export interface CommunityRoleList {
  roles: CommunityRole[];
  permissions: CommunityPermissionMap;
  highest_role_position: number | null;
}

export interface CommunityChannelOverride {
  id: number;
  target_type: 'role' | 'member';
  target_id: number;
  allow: CommunityPermissionMap;
  deny: CommunityPermissionMap;
}

export interface CommunityLinkRequest {
  id: number;
  dialog_id: number;
  requested_by: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  title: string;
  hash: string;
  username: string;
  fname: string;
  lname: string;
}

export interface CommunityAuditEntry {
  id: number;
  actor_id: number;
  action: string;
  target_type: string | null;
  target_id: number | null;
  dialog_id: number | null;
  reason: string | null;
  details: Record<string, unknown>;
  created_at: string;
  username: string;
  fname: string;
  lname: string;
  img: string;
}

export interface CommunityMember {
  id: number;
  username: string;
  fname: string;
  lname: string;
  img: string;
  verify: number;
  is_owner: boolean;
  is_muted: boolean;
  roles: Array<{ id: number; name: string }>;
}

export const COMMUNITY_CHANNEL_RENDERERS: Record<CommunityChannelType, 'messages' | 'voice'> = {
  text: 'messages',
  announcement: 'messages',
  voice: 'voice',
};

export function canCommunity(
  permissions: CommunityPermissionMap | null | undefined,
  permission: CommunityPermissionName,
): boolean {
  return permissions?.[permission] === true;
}

export function visibleManagementTabs(permissions: CommunityPermissionMap): CommunityManagementTab[] {
  const tabs: CommunityManagementTab[] = [];
  if (canCommunity(permissions, 'manage_channels')) tabs.push('channels');
  if (canCommunity(permissions, 'manage_roles')) tabs.push('roles');
  if (canCommunity(permissions, 'manage_members')) tabs.push('members');
  if (canCommunity(permissions, 'manage_channels')) tabs.push('link_requests');
  if (canCommunity(permissions, 'view_audit_log')) tabs.push('audit');
  return tabs;
}

export function communityErrorKey(status: number): 'community_permission_error' | 'community_stale_error' | 'community_save_error' {
  if (status === 403) return 'community_permission_error';
  if (status === 409) return 'community_stale_error';
  return 'community_save_error';
}
