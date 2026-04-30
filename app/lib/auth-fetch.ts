const FALLBACK_ORIGIN = 'https://ancial.local';

function getBaseOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return FALLBACK_ORIGIN;
}

function isAbsoluteUrl(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function isLegacyAuthenticatedPath(pathname: string) {
  return (
    (pathname.startsWith('/api/') && pathname.endsWith('.php')) ||
    (pathname.startsWith('/engine/') && pathname.endsWith('.php'))
  );
}

export function getStoredAuthToken() {
  if (typeof window === 'undefined') return '';

  try {
    return (window.localStorage.getItem('token') || '').trim();
  } catch {
    return '';
  }
}

export function withAuthToken(input: string, token = getStoredAuthToken()) {
  const nextToken = String(token ?? '').trim();
  if (!nextToken) return input;

  const baseOrigin = getBaseOrigin();
  let url: URL;

  try {
    url = new URL(input, baseOrigin);
  } catch {
    return input;
  }

  if (isAbsoluteUrl(input) && url.origin !== baseOrigin) {
    return input;
  }

  if (!isLegacyAuthenticatedPath(url.pathname) || url.searchParams.has('token')) {
    return input;
  }

  url.searchParams.append('token', nextToken);

  if (isAbsoluteUrl(input)) {
    return url.toString();
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function authFetch(input: string, init?: RequestInit) {
  return fetch(withAuthToken(input), {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  });
}

export async function authFetchJson<T>(input: string, init?: RequestInit) {
  const response = await authFetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function authFetchText(input: string, init?: RequestInit) {
  const response = await authFetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}
