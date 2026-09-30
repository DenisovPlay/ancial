import { isPlainEmail, resolveLinkTarget } from './link-target.ts';

/** Символы, на которых слово (кандидат в ссылку) начинается и заканчивается. */
const DELIMITER = /[\s​ (<"'«[]/u;
/** Знаки препинания в конце слова к ссылке не относятся: «см. example.com, там…». */
const TRAILING_PUNCTUATION = /[.,:;!?)\]}»"'…]+$/u;
const LINK_CORE =
  /^(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:https?:\/\/)?(?:[a-zA-Z0-9\-а-яА-ЯёЁ]+\.)+[a-zA-Zа-яА-ЯёЁ]{2,20}(?::\d{1,5})?(?:\/\S*)?)$/u;
/** Как и в парсере поста: «index.html», «app.js» без схемы ссылками не считаются. */
const FILE_EXTENSION = /\.(php|html?|js|css|zip|rar|exe|png|jpe?g|gif|mp4|avi)$/i;

export function isTokenDelimiter(char: string): boolean {
  return DELIMITER.test(char);
}

/** Границы слова вокруг позиции курсора; null — курсор среди разделителей. */
export function findTokenBounds(text: string, caret: number): { end: number; start: number } | null {
  let start = Math.min(Math.max(caret, 0), text.length);
  let end = start;
  while (start > 0 && !DELIMITER.test(text[start - 1])) start -= 1;
  while (end < text.length && !DELIMITER.test(text[end])) end += 1;
  return end > start ? { end, start } : null;
}

/** Ссылка ли это слово. length — сколько символов от начала слова относится к ссылке (без хвоста-пунктуации). */
export function matchAutoLink(token: string): { href: string; length: number } | null {
  const core = token.replace(TRAILING_PUNCTUATION, '');
  if (!core || !LINK_CORE.test(core)) return null;
  if (!/^https?:\/\//i.test(core) && FILE_EXTENSION.test(core)) return null;
  if (isPlainEmail(core)) return { href: `mailto:${core}`, length: core.length };
  const target = resolveLinkTarget(core);
  return target.type === 'web' ? { href: target.url, length: core.length } : null;
}
