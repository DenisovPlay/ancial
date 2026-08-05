export function normalizeAvatarUrl(
  value: string | null | undefined,
  fallback = '/img/placeholders/user.png',
): string {
  const str = String(value ?? '').trim();
  if (!str || str === '""' || str === 'null' || str === 'undefined') {
    return fallback;
  }
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('/') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return str;
  }
  return `/${str}`;
}
