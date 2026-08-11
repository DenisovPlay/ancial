import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('./[hash]/page.tsx', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('./[hash]/group-call-client.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(pageSource, /\bh-screen\b/);
assert.match(pageSource, /min-h-dvh/);
assert.match(clientSource, /min-h-dvh/);
assert.match(clientSource, /safe-area-inset-top/);
assert.match(clientSource, /safe-area-inset-bottom/);

console.log('group call layout: ok');
