const FALLBACK_ORIGIN = 'https://ancial.local';
export const AUTH_SESSION_RESTORED_EVENT = 'ancial-auth-session-restored';

let authSessionRefreshPromise: Promise<boolean> | null = null;

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

function getUrl(input: string) {
  try {
    return new URL(input, getBaseOrigin());
  } catch {
    return null;
  }
}

function shouldTryLegacySessionRestore(input: string) {
  const url = getUrl(input);
  if (!url) return false;

  if (isAbsoluteUrl(input) && url.origin !== getBaseOrigin()) {
    return false;
  }

  if (!isLegacyAuthenticatedPath(url.pathname)) {
    return false;
  }

  return !url.pathname.startsWith('/api/auth/');
}

export function isLegacyNotLoggedInResponseText(value: string) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return false;

  return text === 'not logged in'
    || text === 'not_logged_in'
    || text.includes('"not logged in"')
    || text.includes("'not logged in'")
    || text.includes('not logged in');
}

export function getStoredAuthToken() {
  if (typeof window === 'undefined') return '';

  try {
    return (window.localStorage.getItem('token') || '').trim();
  } catch {
    return '';
  }
}

export async function restoreLegacyAuthSession(token = getStoredAuthToken()) {
  const nextToken = String(token ?? '').trim();
  if (!nextToken) return false;

  if (authSessionRefreshPromise) {
    return authSessionRefreshPromise;
  }

  authSessionRefreshPromise = (async () => {
    const params = new URLSearchParams();
    params.set('do_login', 'True');
    params.set('token', nextToken);

    try {
      const response = await fetch('/api/auth/login.php', {
        body: params.toString(),
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        method: 'POST',
      });
      const data = await response.json().catch(() => null) as { status?: string } | null;
      const restored = data?.status === 'success';

      if (restored && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_SESSION_RESTORED_EVENT));
      }

      return restored;
    } catch {
      return false;
    } finally {
      authSessionRefreshPromise = null;
    }
  })();

  return authSessionRefreshPromise;
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
  return fetchWithLegacySessionRestore(input, init);
}

async function fetchWithLegacySessionRestore(input: string, init?: RequestInit) {
  const fetchInit = {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  } satisfies RequestInit;
  const response = await fetch(withAuthToken(input), fetchInit);

  if (!shouldTryLegacySessionRestore(input)) {
    return response;
  }

  const hasAuthToken = Boolean(getStoredAuthToken());
  if (!hasAuthToken) {
    return response;
  }

  const notLoggedIn = response.status === 401
    || response.status === 403
    || isLegacyNotLoggedInResponseText(await response.clone().text().catch(() => ''));

  if (!notLoggedIn) {
    return response;
  }

  const restored = await restoreLegacyAuthSession();
  if (!restored) {
    return response;
  }

  return fetch(withAuthToken(input), fetchInit);
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
