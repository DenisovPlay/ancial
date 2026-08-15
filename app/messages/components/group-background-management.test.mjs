import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modalSource = readFileSync(new URL('./group-info-modal.tsx', import.meta.url), 'utf8');
const messagesSource = readFileSync(new URL('../messages-content.tsx', import.meta.url), 'utf8');

assert.match(modalSource, /background\?: string/, 'group modal must receive the current shared background');
assert.match(modalSource, /canManageChannel && \(/, 'background controls must be permission-gated');
assert.match(modalSource, /handleBackgroundUpload/, 'group edit view must upload a background');
assert.match(modalSource, /handleBackgroundClear/, 'group edit view must clear a background');
assert.match(modalSource, /onGroupUpdated\(\{ background:/, 'group modal must report the new background');
assert.match(messagesSource, /background=\{dialogBackgroundUrl\}/, 'messages page must pass the active background');
assert.match(messagesSource, /partial\?\.background/, 'messages page must apply background updates immediately');

console.log('group background management: ok');
