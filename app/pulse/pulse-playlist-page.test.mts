import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getPulseBuiltinPlaylistTitle,
  isPulseBuiltinGeneratedPlaylist,
} from './playlist/playlist-model.ts';

test('favorites playlist has a stable built-in title', () => {
  assert.equal(getPulseBuiltinPlaylistTitle('-5'), 'Избранное');
  assert.equal(isPulseBuiltinGeneratedPlaylist('-5'), true);
});

test('playlist page metadata does not block navigation with API fetches', async () => {
  const source = await readFile(new URL('./playlist/[id]/page.tsx', import.meta.url), 'utf8');

  assert.equal(source.includes('getRequestUrl'), false);
  assert.equal(source.includes('fetch('), false);
  assert.match(source, /getPulseBuiltinPlaylistTitle\(playlistId\)/);
  assert.match(source, /createPageMetadata\(/);
});

test('playlist content uses built-in generated playlist state', async () => {
  const source = await readFile(new URL('./playlist/[id]/playlist-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /getPulseBuiltinPlaylistTitle\(playlistId\)/);
  assert.match(source, /isPulseBuiltinGeneratedPlaylist\(playlistId\)/);
  assert.equal(source.includes("playlistId === '-1' || playlistId === '-2' || playlistId === '-5'"), false);
});

test('playlist page main content does not inherit mobile player bottom padding', async () => {
  const layoutSource = await readFile(new URL('../layout.tsx', import.meta.url), 'utf8');
  const mainContentSource = await readFile(new URL('../components/main-content.tsx', import.meta.url), 'utf8');

  assert.match(layoutSource, /import MainContent from ['"]\.\/components\/main-content['"]/);
  assert.match(layoutSource, /<MainContent>\s*\{children\}\s*<\/MainContent>/);
  assert.equal(layoutSource.includes('id="main-content" className="flex-1 flex flex-col pb-20 md:pb-0'), false);

  assert.match(mainContentSource, /usePathname/);
  assert.match(mainContentSource, /isPulsePlaylistPage/);
  assert.match(mainContentSource, /!isPulsePlaylistPage && ['"]pb-20 md:pb-0['"]/);
});
