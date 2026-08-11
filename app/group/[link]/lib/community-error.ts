import { AncialAPIError } from '../../../lib/api-v2';
import { communityErrorKey } from './community-types';

export function communityErrorText(error: unknown, lang: Record<string, string> | null | undefined): string {
  const status = error instanceof AncialAPIError ? error.status : 500;
  const key = communityErrorKey(status);
  return lang?.[key] || lang?.community_save_error || 'Community request failed';
}
