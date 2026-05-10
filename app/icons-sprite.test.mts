import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return [];
      return collectFiles(path);
    }

    return /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  }));

  return files.flat();
}

test('root layout inlines the SVG sprite once for route-stable icons', async () => {
  const layout = await readFile(new URL('./layout.tsx', import.meta.url), 'utf8');
  const sprite = await readFile(new URL('./components/icon-sprite.tsx', import.meta.url), 'utf8');

  assert.match(layout, /import IconSprite from '\.\/components\/icon-sprite';/);
  assert.match(layout, /<IconSprite \/>/);
  assert.match(sprite, /public\/icons\.svg/);
  assert.match(sprite, /dangerouslySetInnerHTML/);
});

test('app icons use the inlined sprite instead of external symbol URLs', async () => {
  const appDirectory = new URL('.', import.meta.url).pathname;
  const files = await collectFiles(appDirectory);
  const offenders: string[] = [];

  await Promise.all(files.map(async (file) => {
    if (file.endsWith('.test.mts')) return;
    const source = await readFile(file, 'utf8');

    if (source.includes('/icons.svg#')) {
      offenders.push(file.replace(appDirectory, 'app/'));
    }
  }));

  assert.deepEqual(offenders.sort(), []);
});
