import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./cinema-idle-screensaver.tsx', import.meta.url), 'utf8');

assert.match(
  source,
  /backdropUrl\s*\|\|\s*m\.posterUrl/,
  'cached Movie entries must be filtered using the actual backdropUrl/posterUrl model fields',
);
assert.match(source, /new Set/, 'cached movies must remain deduplicated');

console.log('cinema idle screensaver cache contract: ok');
