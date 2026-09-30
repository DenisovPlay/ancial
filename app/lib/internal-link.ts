/** Собственные домены сайта: ссылки на них не нужно проверять на странице «Переход на сторонний ресурс». */
const OWN_HOSTS = new Set(['zypo.cc', 'www.zypo.cc']);

/**
 * Путь внутри сайта для ссылки на собственный домен (или относительной ссылки), иначе null.
 * Поддомены, чужие порты, userinfo и не-http схемы внутренними не считаются.
 */
export function toInternalPath(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return value;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password || url.port) return null;
  if (!OWN_HOSTS.has(url.hostname.toLowerCase())) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
