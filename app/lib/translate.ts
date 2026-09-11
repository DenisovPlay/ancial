/**
 * Общие хелперы перевода контента (посты и т.д.) — раньше были продублированы
 * по нескольким файлам (feed/profile/group/post), теперь единая реализация.
 */

/**
 * Грубое определение языка текста по доминирующему алфавиту — без сети и внешних библиотек.
 * Различает ru/be/en, чего достаточно под три локали приложения. Короткие/смешанные
 * тексты (меньше 12 буквенных символов) намеренно не определяются — вернётся null.
 */
export function detectTextLanguage(text: string): string | null {
  const stripped = text.replace(/<[^>]+>/g, ' ');
  const cyrillicCount = (stripped.match(/[а-яёіў]/gi) || []).length;
  const latinCount = (stripped.match(/[a-z]/gi) || []).length;

  if (cyrillicCount + latinCount < 12) return null;
  if (cyrillicCount > latinCount) {
    const belarusianMarkers = (stripped.match(/[ўі]/gi) || []).length;
    return belarusianMarkers >= 2 ? 'be' : 'ru';
  }
  if (latinCount > cyrillicCount) return 'en';
  return null;
}

/**
 * DOMParser не исполняет скрипты и не грузит изображения,
 * в отличие от createElement('div') + innerHTML.
 */
export function htmlToPlainText(value: string | null | undefined): string {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return value;
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return doc.body.textContent || '';
}

/** Неофициальный Google Translate endpoint. */
export async function translateToLang(sourceText: string, targetLang: string): Promise<string> {
  if (!sourceText.trim()) return sourceText;
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    `&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(sourceText)}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = (await response.json()) as unknown[];
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = (data[0] as Array<[string]>).map((item) => item?.[0]).filter(Boolean).join('');
    return translated || sourceText;
  }
  return sourceText;
}
