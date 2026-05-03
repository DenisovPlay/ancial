import { SITE_CONFIG } from '../seo.ts';

export type PulseNavigationTarget = {
  href: string;
  type: 'external' | 'internal';
};

function normalizePulsePath(path: string) {
  const normalizedPath = String(path || '').trim();
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}

export function getPulseExternalUrl(path: string) {
  return `${SITE_CONFIG.url}${normalizePulsePath(path)}`;
}

export function getPulseNavigationTarget(path: string): PulseNavigationTarget {
  const normalizedPath = normalizePulsePath(path);

  if (/^\/pulse\/playlist\/[^/?#]+(?:[?#].*)?$/.test(normalizedPath)) {
    return {
      href: normalizedPath,
      type: 'internal',
    };
  }

  if (normalizedPath === '/pulse') {
    return {
      href: normalizedPath,
      type: 'internal',
    };
  }

  return {
    href: getPulseExternalUrl(normalizedPath),
    type: 'external',
  };
}
