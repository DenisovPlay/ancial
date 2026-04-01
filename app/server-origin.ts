import { headers } from 'next/headers';

import { SITE_CONFIG } from './seo';

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export async function getRequestOrigin() {
  const headerList = await headers();
  const forwardedHost = headerList.get('x-forwarded-host');
  const host = forwardedHost ?? headerList.get('host');
  const forwardedProto = headerList.get('x-forwarded-proto');

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

    return trimTrailingSlash(`${protocol}://${host}`);
  }

  const fallback =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    SITE_CONFIG.url;

  return trimTrailingSlash(fallback);
}

export async function getRequestUrl(path: string) {
  return `${await getRequestOrigin()}${normalizePath(path)}`;
}
