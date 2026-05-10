import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

test('empty Pulse search still requests API so it can return random content', async () => {
  const source = await readFile(new URL('./search/search-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /fetchPulseJson<PulseSearchResponse>\(`\/api\/pulse\/search\.php\?q=\$\{encodeURIComponent\(query\)\}`\)/);
  assert.equal(source.includes('if (!query) {'), false);
  assert.equal(source.includes('setArtists([]);\n        setPlaylists([]);\n        setTracks([]);\n        setLoading(false);\n        return;'), false);
});

test('Pulse search input follows the current URL query', async () => {
  const source = await readFile(new URL('./search/search-content.tsx', import.meta.url), 'utf8');

  assert.match(source, /useEffect\(\(\) => {\s*setSearchValue\(query\);\s*}, \[query\]\);/);
});

test('Pulse search shows a real loading shell while search params resolve', async () => {
  const pageSource = await readFile(new URL('./search/page.tsx', import.meta.url), 'utf8');

  assert.match(pageSource, /import PulseSearchLoading from '\.\/search-loading';/);
  assert.match(pageSource, /<Suspense fallback=\{<PulseSearchLoading \/>\}>/);

  await access(new URL('./search/loading.tsx', import.meta.url));

  const loadingSource = await readFile(new URL('./search/loading.tsx', import.meta.url), 'utf8');
  assert.match(loadingSource, /PulseSearchLoading/);
});
