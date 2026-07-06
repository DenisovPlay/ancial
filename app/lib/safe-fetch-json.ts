export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, init);

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
