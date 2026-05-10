import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import test from 'node:test';

const appDir = new URL('./', import.meta.url);

async function collectPageFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return collectPageFiles(path);
      if (entry.isFile() && entry.name === 'page.tsx') return [path];
      return [];
    }),
  );

  return nested.flat();
}

test('page metadata does not block the first render with API requests', async () => {
  const pageFiles = await collectPageFiles(appDir.pathname);
  const offenders: string[] = [];

  await Promise.all(
    pageFiles.map(async (file) => {
      const source = await readFile(file, 'utf8');
      if (!source.includes('generateMetadata')) return;
      if (!/(fetch\(|getRequestUrl|cache:\s*['"]no-store['"])/.test(source)) return;

      offenders.push(relative(appDir.pathname, file));
    }),
  );

  assert.deepEqual(offenders.sort(), []);
});

test('dynamic social pages update browser title from client-loaded data', async () => {
  const files = [
    'profile/[login]/profile-content.tsx',
    'group/[link]/group-content.tsx',
    'feed/post/[id]/post-content.tsx',
  ];

  await Promise.all(
    files.map(async (file) => {
      const source = await readFile(new URL(file, appDir), 'utf8');

      assert.match(source, /useDocumentTitle\(/, `${file} should set the precise title after data loads`);
    }),
  );
});
