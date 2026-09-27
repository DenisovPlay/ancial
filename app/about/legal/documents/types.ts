/**
 * Юридические документы Zypo — данными, а не разметкой: один компонент рисует любой документ,
 * у каждого свой адрес /about/legal/<slug> и текст сразу в HTML страницы.
 *
 * Внутри строк работают ссылки:
 * - `[[/about/legal/privacy|Политика обработки персональных данных]]` — внутренняя/внешняя ссылка с текстом;
 * - адреса почты (contact@zypo.cc) и https://… превращаются в ссылки сами.
 */

export type LegalLang = 'ru' | 'en';

export type LegalBlock =
  | string
  | { list: string[] }
  | { note: string }
  | { table: { head: string[]; rows: string[][] } };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocMeta = {
  slug: string;
  lang: LegalLang;
  title: string;
  /** Одна строка для карточки в списке документов. */
  summary: string;
};

export type LegalDoc = LegalDocMeta & {
  version: string;
  /** Строка о дате: «Редакция от …, действует с …». */
  effective: string;
  /** Абзацы перед оглавлением (преамбула). */
  intro?: LegalBlock[];
  sections: LegalSection[];
};
