import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('home playlists and my library use the shared playlist tile component', async () => {
  const source = await readFile(new URL('./pulse-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /import \{[^}]*PulsePlaylistTile[^}]*PulsePlaylistTileSkeleton[^}]*\} from '\.\/pulse-components';/s);
  assert.equal(source.includes('function PulsePlaylistCard('), false);
  assert.equal(source.includes('function PlaylistCardSkeleton('), false);
});

test('compact playlist tiles keep the same text scale as home playlist cards', async () => {
  const source = await readFile(new URL('./pulse-components.tsx', import.meta.url), 'utf8');

  assert.match(source, /const titleTextClass = variant === 'big'\s*\?\s*'text-sm lg:text-lg'\s*:\s*'text-sm';/);
  assert.match(source, /const descriptionTextClass = variant === 'big'\s*\?\s*'hidden text-xs text-zinc-300 lg:flex lg:text-base'\s*:\s*'hidden text-xs text-zinc-300 lg:flex';/);
});

test('pulse library keeps the large playlist tile variant', async () => {
  const source = await readFile(new URL('./library/library-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /<PulsePlaylistTileSkeleton key=\{index\} variant="big" \/>/);
  assert.match(source, /<PulsePlaylistTile[\s\S]*?variant="big"[\s\S]*?\/>/);
});
