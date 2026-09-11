export interface ReportReason {
  label: string;
  value: string;
}

interface PostReportStrings {
  candidimage: string;
  prohibitedgood: string;
  propertyrights: string;
  scam: string;
  spam: string;
  violence: string;
}

/**
 * Причины жалобы на пост/комментарий — раньше список дублировался
 * по 4 файлам (group/profile/feed/post), каждый строил его из своего `strings`.
 */
export function buildPostReportReasons(strings: PostReportStrings): ReportReason[] {
  return [
    { label: strings.spam, value: strings.spam },
    { label: strings.prohibitedgood, value: strings.prohibitedgood },
    { label: strings.scam, value: strings.scam },
    { label: strings.violence, value: strings.violence },
    { label: strings.candidimage, value: strings.candidimage },
    { label: strings.propertyrights, value: strings.propertyrights },
  ];
}

/**
 * Причины жалобы на трек (type: 6) — раньше список дублировался по 5 pulse-файлам.
 * value намеренно фиксирован по-русски независимо от языка интерфейса (так было
 * и в исходной PulseReportModal) — бэкенд получает не зависящее от lang значение.
 */
export function buildPulseTrackReportReasons(lang: Record<string, string> | null): ReportReason[] {
  return [
    { label: lang?.report_spam || 'Спам', value: 'Спам' },
    { label: lang?.report_illegal_item || 'Запрещённый товар', value: 'Запрещённый товар' },
    { label: lang?.report_fraud || 'Обман', value: 'Обман' },
    { label: lang?.report_violence || 'Насилие и вражда', value: 'Насилие и вражда' },
    { label: lang?.report_explicit || 'Откровенное изображение', value: 'Откровенное изображение' },
    { label: lang?.report_copyright || 'Нарушение интеллектуальных прав', value: 'Нарушение интеллектуальных прав' },
  ];
}
