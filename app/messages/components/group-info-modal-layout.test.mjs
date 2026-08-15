import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('./group-info-modal.tsx', import.meta.url),
  'utf8',
);

assert.match(
  source,
  /canManageInvites/,
  'invite controls must depend on the invite permission returned by the backend',
);
assert.match(
  source,
  /access\.canManageInvites && Boolean/,
  'cached invite codes must stay hidden unless the backend explicitly grants permission',
);
assert.match(
  source,
  /\{canManageInvites \? \(/,
  'the invite action must not render for members without invite permission',
);
assert.match(
  source,
  /className="col-span-full/,
  'the Leave button must span the complete action grid',
);
assert.match(
  source,
  /lang\?\.settings \|\| 'Настройки'/,
  'the settings action must use the concise localized label',
);

console.log('group info modal layout: ok');
