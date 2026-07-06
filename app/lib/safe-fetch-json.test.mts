import assert from 'node:assert/strict';
import test from 'node:test';

import { safeFetchJson } from './safe-fetch-json.ts';

test('safeFetchJson returns parsed JSON payloads', async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: true, data: { usd: '77.22' } }), {
      headers: { 'content-type': 'application/json; charset=utf-8' },
      status: 200,
    });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = await safeFetchJson<{ data: { usd: string }; success: boolean }>('/api/V2/info/GetCurrency.php');

  assert.deepEqual(payload, { success: true, data: { usd: '77.22' } });
});

test('safeFetchJson returns null for non-ok legacy responses', async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response('Internal Server Error', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      status: 500,
      statusText: 'Internal Server Error',
    });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = await safeFetchJson('/api/V2/info/GetCurrency.php');

  assert.equal(payload, null);
});

test('safeFetchJson returns null for invalid JSON bodies', async (t) => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response('Internal Server Error', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      status: 200,
    });

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const payload = await safeFetchJson('/api/V2/info/GetCurrency.php');

  assert.equal(payload, null);
});
