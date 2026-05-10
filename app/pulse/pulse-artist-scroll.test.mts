import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Pulse home artist scroller keeps gutters for avatar shadows', async () => {
  const source = await readFile(new URL('./pulse-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /ref=\{artistsScrollRef\} className="viewport dragscroll -mx-3 -my-3 flex w-full max-w-screen-2xl flex-nowrap gap-3 overflow-x-auto px-3 py-3 lg:px-0"/);
});

test('Pulse search artist scroller keeps gutters for avatar shadows', async () => {
  const source = await readFile(new URL('./search/search-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /className="viewport dragscroll -mx-3 -my-3 flex overflow-auto px-3 py-3 lg:px-0"/);
});
