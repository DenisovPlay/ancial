import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Pulse full player does not render duplicate blurred cover image layers', async () => {
  const source = await readFile(new URL('../context/PulsePlayerContext.tsx', import.meta.url), 'utf8');

  assert.equal(source.includes('className="rounded-3xl blur-xl"'), false);
});

test('PulseCoverImage fallback img is removed from normal flex flow', async () => {
  const source = await readFile(new URL('./pulse-image.tsx', import.meta.url), 'utf8');

  assert.match(source, /<img[^>]+className=\{cn\('absolute inset-0 h-full w-full object-cover'/s);
});

test('i.imgur.com covers are handled by Next Image instead of fallback img', async () => {
  const imageSource = await readFile(new URL('./pulse-image.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../next.config.ts', import.meta.url), 'utf8');

  assert.match(imageSource, /'i\.imgur\.com'/);
  assert.match(nextConfig, /hostname:\s*'i\.imgur\.com'/);
});
