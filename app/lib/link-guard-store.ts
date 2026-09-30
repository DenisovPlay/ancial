/**
 * Внешняя ссылка, для которой открыто окно проверки безопасности (LinkGuardHost).
 * Страница /redirect остаётся запасным вариантом: по обычной ссылке, в новой вкладке, без JS.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

export function openLinkGuard(url: string) {
  current = url;
  emit();
}

export function closeLinkGuard() {
  if (current === null) return;
  current = null;
  emit();
}

export function subscribeLinkGuard(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLinkGuardSnapshot() {
  return current;
}

/** Ссылка проверки из href вида /redirect?link=… (как их собирают парсеры постов и сообщений). */
export function parseRedirectHref(href: string | null | undefined): string | null {
  if (!href || !href.startsWith('/redirect?')) return null;
  try {
    const link = new URL(href, 'https://zypo.cc').searchParams.get('link');
    return link && link.trim() !== '' ? link : null;
  } catch {
    return null;
  }
}
