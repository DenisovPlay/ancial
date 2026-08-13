import type { CommunityChannelType } from './community-types';

const CHANNEL_ICON_IDS: Record<CommunityChannelType, 'IC-chats' | 'IC-news' | 'IC-call'> = {
  text: 'IC-chats',
};

export function communityChannelIconId(type: CommunityChannelType) {
  return CHANNEL_ICON_IDS[type];
}

export function communityChannelTypeLabel(
  type: CommunityChannelType,
  labels: Record<CommunityChannelType, string>,
) {
  return labels[type];
}

export function shouldShowUncategorizedHeading(categoryChannelCount: number, uncategorizedChannelCount: number) {
  return categoryChannelCount > 0 && uncategorizedChannelCount > 0;
}

export function formatCommunityAuditDate(value: string, languageName?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat(languageName === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function communityAuditActionLabel(
  action: string,
  dictionary?: Record<string, unknown> | null,
) {
  const normalized = action.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const key = `community_audit_action_${normalized}`;
  const translated = dictionary?.[key];
  if (typeof translated === 'string' && translated.trim()) return translated;

  const readable = action.trim().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (!readable) return '—';
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}
