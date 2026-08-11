import type { CommunityChannelType } from './community-types';

const CHANNEL_ICON_IDS: Record<CommunityChannelType, 'IC-chats' | 'IC-news' | 'IC-call'> = {
  text: 'IC-chats',
  announcement: 'IC-news',
  voice: 'IC-call',
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

export function formatCommunityAuditDate(value: string, languageName?: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat(languageName === 'en' ? 'en-US' : 'ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
