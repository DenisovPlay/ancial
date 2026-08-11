import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const channelSource = readFileSync(new URL('./community-channel-editor.tsx', import.meta.url), 'utf8');
const roleSource = readFileSync(new URL('./community-role-editor.tsx', import.meta.url), 'utf8');
const moderationSource = readFileSync(new URL('./community-moderation.tsx', import.meta.url), 'utf8');
const combinedSource = `${channelSource}\n${roleSource}\n${moderationSource}`;

assert.doesNotMatch(combinedSource, /window\.confirm/);
assert.match(channelSource, /ConfirmDeleteModal/);
assert.match(roleSource, /ConfirmDeleteModal/);
assert.match(moderationSource, /ConfirmDeleteModal/);

console.log('community confirmations: ok');
