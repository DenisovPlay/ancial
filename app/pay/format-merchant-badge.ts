export function formatMerchantBadge(
  merchant: { badge?: string; badge_key?: string; badge_count?: number } | null | undefined,
  lang: Record<string, string> | null
): string {
  if (!merchant) return '';

  let key = merchant.badge_key;
  let count = Number(merchant.badge_count ?? 0);

  if (!key && merchant.badge) {
    const trimmed = merchant.badge.trim();
    if (/^(менее месяца|менш за месяц|less than a month)$/i.test(trimmed)) {
      key = 'pay_less_than_month';
    } else {
      const match = trimmed.match(/^(\d+)\s+(.+)$/);
      if (match) {
        count = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        if (/^(год|года|лет|гады|гадоў|year|years)$/i.test(unit)) {
          key = 'years';
        } else if (/^(месяц|месяца|месяцев|месяцы|месяцаў|month|months)$/i.test(unit)) {
          key = 'months';
        }
      }
    }
  }

  if (key === 'pay_less_than_month') {
    return lang?.pay_less_than_month || 'менее месяца';
  }

  if (key === 'years' && count > 0) {
    if (lang?.langname === 'en') {
      return `${count} ${count === 1 ? (lang?.year || 'year') : (lang?.yearA || 'years')}`;
    }

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `${count} ${lang?.years_plural || 'лет'}`;
    }
    if (lastDigit === 1) {
      return `${count} ${lang?.year || 'год'}`;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${count} ${lang?.yearA || 'года'}`;
    }
    return `${count} ${lang?.years_plural || 'лет'}`;
  }

  if (key === 'months' && count > 0) {
    if (lang?.langname === 'en') {
      return `${count} ${count === 1 ? (lang?.month || 'month') : (lang?.monthA || 'months')}`;
    }

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return `${count} ${lang?.monthCEV || 'месяцев'}`;
    }
    if (lastDigit === 1) {
      return `${count} ${lang?.month || 'месяц'}`;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return `${count} ${lang?.monthA || 'месяца'}`;
    }
    return `${count} ${lang?.monthCEV || 'месяцев'}`;
  }

  return merchant.badge || '';
}
