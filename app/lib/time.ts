/**
 * Localized client-side date and relative time formatting helpers.
 * Translates server datetime strings (Moscow time UTC+3) into user's local time & language.
 */

export function parseServerDate(raw: string | number | Date | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;

  if (typeof raw === 'number') {
    if (raw < 10_000_000_000) return new Date(raw * 1000);
    return new Date(raw);
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Numeric string timestamp
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (num < 10_000_000_000) return new Date(num * 1000);
    return new Date(num);
  }

  const isoValue = str.replace(' ', 'T');
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(isoValue);
  const normalizedIso =
    !hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(isoValue)
      ? `${isoValue}+03:00`
      : isoValue;

  const date = new Date(normalizedIso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(
  rawDate: string | number | Date | null | undefined,
  lang?: Record<string, string> | null,
  fallback = ''
): string {
  const date = parseServerDate(rawDate);
  if (!date) return fallback;

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSec < 60) {
    return lang?.now || 'только что';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    const unit = lang?.i || lang?.m || 'мин';
    const ago = lang?.ago || 'назад';
    return `${diffMin} ${unit} ${ago}`.trim();
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    const unit = lang?.h || 'ч';
    const ago = lang?.ago || 'назад';
    return `${diffHours} ${unit} ${ago}`.trim();
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    const unit = lang?.d || 'дн';
    const ago = lang?.ago || 'назад';
    return `${diffDays} ${unit} ${ago}`.trim();
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    const unit = lang?.w || 'нед';
    const ago = lang?.ago || 'назад';
    return `${diffWeeks} ${unit} ${ago}`.trim();
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    const unit = lang?.m_short || lang?.m || 'мес';
    const ago = lang?.ago || 'назад';
    return `${diffMonths} ${unit} ${ago}`.trim();
  }

  const diffYears = Math.floor(diffDays / 365);
  const unit = lang?.y || 'г';
  const ago = lang?.ago || 'назад';
  return `${diffYears} ${unit} ${ago}`.trim();
}
