'use client';

import { authFetch } from '../lib/auth-fetch';

export async function fetchPulseJson<T>(url: string): Promise<T> {
  const response = await authFetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const text = await response.text();
  return JSON.parse(text) as T;
}
