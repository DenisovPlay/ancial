import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./modal.tsx', import.meta.url), 'utf8');

assert.match(source, /role="dialog"/);
assert.match(source, /aria-modal="true"/);
assert.match(source, /previouslyFocusedElementRef/);
assert.match(source, /focusableElements/);
assert.match(source, /overflowBeforeOpenRef/);

console.log('modal accessibility: ok');
