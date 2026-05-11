import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Pulse modal uses the base modal shell and header', async () => {
  const source = await readFile(new URL('./pulse-modal.tsx', import.meta.url), 'utf8');

  assert.match(source, /title=\{title\}/);
  assert.match(source, /bodyClassName=\{cn\(/);
  assert.equal(source.includes('showHeader={false}'), false);
  assert.equal(source.includes('unstyled'), false);
  assert.equal(source.includes('rounded-2xl border border-zinc-600/30 bg-zinc-900/70'), false);
  assert.equal(source.includes('ActionIcon'), false);
});
