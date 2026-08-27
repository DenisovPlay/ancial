/**
 * Resolves a backend API error or message code to localized text using the current lang dictionary.
 * Falls back to the provided fallback or the raw code itself.
 */
export function getApiMessage(
  code: string | null | undefined,
  lang?: Record<string, string> | null,
  fallback?: string,
): string {
  if (!code) {
    return fallback || '';
  }

  // Look up in client translations
  if (lang && lang[code]) {
    return lang[code];
  }

  return fallback || code;
}
