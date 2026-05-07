import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('app screenshots use the shared image viewer instead of opening a new tab', async () => {
  const source = await readFile(new URL('./app-info-modal.tsx', import.meta.url), 'utf8');

  assert.match(source, /import ImageViewerModal/);
  assert.match(source, /openScreenshot\(index\)/);
  assert.equal(source.includes('target="_blank"'), false);
  assert.equal(source.includes('<a href={image}'), false);
});

test('feed image viewer is provided as a shared component', async () => {
  const source = await readFile(new URL('../components/posts-renderer.tsx', import.meta.url), 'utf8');

  assert.match(source, /from '\.\/image-viewer-modal'/);
  assert.equal(source.includes('function ImageViewerModal('), false);
});
