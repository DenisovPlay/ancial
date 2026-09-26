import { backendFetch } from './auth-fetch';

export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  // Строки — пути бэкенда: на сайте backendFetch это обычный fetch, в приложении — прямой запрос с Bearer.
  const response = typeof input === 'string' ? await backendFetch(input, init) : await fetch(input, init);

  if (!response.ok) {
    return null;
  }

  const body = await response.text();

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}
