import { AncialAPIError, getApiMessage } from '../../../lib/api-v2';
import { communityErrorKey } from './community-types';

export function communityErrorText(error: unknown, lang: Record<string, string> | null | undefined): string {
  if (error instanceof Error && error.message) {
    const fromApi = getApiMessage(error.message, lang);
    if (fromApi && fromApi !== error.message) {
      return fromApi;
    }
  }
  const status = error instanceof AncialAPIError ? error.status : 500;
  const key = communityErrorKey(status);
  return lang?.[key] || lang?.community_save_error || 'Community request failed';
}
