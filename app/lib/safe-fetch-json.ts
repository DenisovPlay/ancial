import { API_BASE } from '../config';
import { isCapacitorNative } from './capacitor';

export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  let target = input;
  if (typeof input === 'string' && input.startsWith('/') && isCapacitorNative()) {
    target = `${API_BASE.replace(/\/$/, '')}${input}`;
  }

  const response = await fetch(target, init);

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
