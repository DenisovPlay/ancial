import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./group-info-modal.tsx', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /isAdminOrOwner \? 'grid-cols-3' : 'grid-cols-2'/,
  'the action grid must use explicit Tailwind column classes',
);
assert.match(
  source,
  /isAdminOrOwner \? 'col-span-full' : ''/,
  'the administrator Leave button must span the complete action grid',
);

console.log('group info modal layout: ok');
