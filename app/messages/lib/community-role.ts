export type CommunityDisplayRole = {
  id: number | null;
  name: string;
  color: string;
  position: number;
  system_key: 'owner' | 'administrator' | 'editor' | 'member' | string | null;
  is_owner: boolean;
};

type RoleTranslations = Record<string, string> | null | undefined;

const FALLBACK_ROLE_COLOR = '#a855f7';
const ROLE_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function getCommunityRoleLabel(
  role: CommunityDisplayRole | null | undefined,
  lang: RoleTranslations,
): string | null {
  if (!role || role.system_key === 'member') return null;

  if (role.system_key === 'owner') {
    return lang?.community_owner || role.name;
  }
  if (role.system_key === 'administrator') {
    return lang?.role_admin || role.name;
  }
  if (role.system_key === 'editor') {
    return lang?.role_editor || role.name;
  }

  return role.name.trim() || null;
}

export function getCommunityRoleBadgeStyle(
  role: CommunityDisplayRole,
): { color: string; backgroundColor: string; borderColor: string } {
  const color = ROLE_COLOR_PATTERN.test(role.color) ? role.color.toLowerCase() : FALLBACK_ROLE_COLOR;
  return {
    color,
    backgroundColor: `${color}26`,
    borderColor: `${color}4d`,
  };
}
