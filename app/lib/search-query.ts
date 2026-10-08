/** Разбор строки поиска и адреса результатов (главная страница с `?q=`). */

export type SearchTab = 'groups' | 'images' | 'music' | 'users' | 'web';

export const SEARCH_TABS: SearchTab[] = ['web', 'images', 'users', 'groups', 'music'];

export const SEARCH_MAX_LENGTH = 200;

export function parseSearchTab(value: string | null | undefined): SearchTab {
  return SEARCH_TABS.includes(value as SearchTab) ? (value as SearchTab) : 'web';
}

/** Адрес результатов: выдача живёт на главной (`/?q=…`), вкладка «Интернет» — по умолчанию, в адрес не попадает. */
export function searchHref(query: string, tab: SearchTab = 'web'): string {
  const params = new URLSearchParams({ q: query.trim().slice(0, SEARCH_MAX_LENGTH) });
  if (tab !== 'web') params.set('tab', tab);
  return `/?${params.toString()}`;
}

export type SearchInput = { kind: 'empty' } | { kind: 'query'; query: string } | { kind: 'url'; url: string };

const URL_PATTERN = /^(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(com|ru|net|org|io|kz|рф)[^\s]*)$/i;

/** Введён адрес сайта — открываем его, а не ищем; иначе это запрос. */
export function classifySearchInput(input: string): SearchInput {
  const value = input.trim();
  if (!value) return { kind: 'empty' };
  if (URL_PATTERN.test(value)) return { kind: 'url', url: /^https?:\/\//i.test(value) ? value : `https://${value}` };
  return { kind: 'query', query: value.slice(0, SEARCH_MAX_LENGTH) };
}
