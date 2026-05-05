import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('hidden reconnect banner stays inside the viewport during mobile overscroll', () => {
  const source = readFileSync(new URL('./GlobalWSProvider.tsx', import.meta.url), 'utf8');

  assert.equal(
    source.includes("-translate-y-[110%]"),
    false,
    'hidden reconnect banner must not be parked above the viewport where iOS rubber-band can reveal it',
  );
  assert.match(source, /opacity-0/);
});

test('home route opts out of document scrolling in standalone mobile mode', () => {
  const pageSource = readFileSync(new URL('../page.tsx', import.meta.url), 'utf8');
  const cssSource = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');

  assert.match(pageSource, /home-route/);
  assert.match(pageSource, /100dvh/);
  assert.match(cssSource, /body:has\(\.home-route\)/);
  assert.match(cssSource, /overscroll-behavior-y:\s*none/);
});
