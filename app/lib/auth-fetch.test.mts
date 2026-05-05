import assert from 'node:assert/strict';
import test from 'node:test';

import { authFetch, withAuthToken } from './auth-fetch.ts';

test('withAuthToken appends local token to legacy PHP API URLs', () => {
  assert.equal(
    withAuthToken('/api/messages/dialogs.php', 'secret token'),
    '/api/messages/dialogs.php?token=secret+token',
  );
});

test('withAuthToken preserves existing query params and hashes', () => {
  assert.equal(
    withAuthToken('/api/messages/dialog.php?di_id=42&limit=30#bottom', 'abc'),
    '/api/messages/dialog.php?di_id=42&limit=30&token=abc#bottom',
  );
});

test('withAuthToken does not override explicit tokens', () => {
  assert.equal(
    withAuthToken('/api/user/info.php?token=explicit', 'stored'),
    '/api/user/info.php?token=explicit',
  );
});

test('withAuthToken appends token to legacy engine URLs', () => {
  assert.equal(
    withAuthToken('/engine/modules/msg/sendmsg.php?di_id=7', 'abc'),
    '/engine/modules/msg/sendmsg.php?di_id=7&token=abc',
  );
});

test('withAuthToken leaves non-legacy URLs untouched', () => {
  assert.equal(withAuthToken('/api/7tv/search?q=test', 'abc'), '/api/7tv/search?q=test');
  assert.equal(withAuthToken('https://api.imgbb.com/1/upload', 'abc'), 'https://api.imgbb.com/1/upload');
});

test('authFetch restores legacy PHP session by token and retries Not Logged In responses', async (t) => {
  const originalFetch = globalThis.fetch;
  const testGlobal = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
  const originalWindow = testGlobal.window;
  const calls: Array<{ body?: string; input: string; method?: string }> = [];

  testGlobal.window = ({
    dispatchEvent: () => true,
    location: { origin: 'https://ancial.local' } as Location,
    localStorage: {
      getItem: (key: string) => (key === 'token' ? 'stored-token' : ''),
    } as Storage,
  } as unknown) as Window & typeof globalThis;

  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      body: typeof init?.body === 'string' ? init.body : undefined,
      input: String(input),
      method: init?.method,
    });

    if (calls.length === 1) {
      return new Response('Not Logged In', { status: 200 });
    }

    if (calls.length === 2) {
      return new Response(JSON.stringify({ status: 'success' }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    testGlobal.window = originalWindow;
  });

  const response = await authFetch('/api/messages/dialogs.php');

  assert.deepEqual(calls.map((call) => call.input), [
    '/api/messages/dialogs.php?token=stored-token',
    '/api/auth/login.php',
    '/api/messages/dialogs.php?token=stored-token',
  ]);
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].body, 'do_login=True&token=stored-token');
  assert.equal(await response.text(), JSON.stringify({ ok: true }));
});
