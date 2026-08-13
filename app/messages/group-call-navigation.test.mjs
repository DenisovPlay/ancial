import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const messagesSource = readFileSync(new URL('./messages-content.tsx', import.meta.url), 'utf8');
const groupButtonStart = messagesSource.indexOf('id="group-voice-button"');
const groupButtonEnd = messagesSource.indexOf('</button>', groupButtonStart);

assert.notEqual(groupButtonStart, -1, 'group-call button must exist');
assert.notEqual(groupButtonEnd, -1, 'group-call button must have a closing tag');

const groupButtonSource = messagesSource.slice(groupButtonStart, groupButtonEnd);
const pauseIndex = groupButtonSource.indexOf('if (isPlaying) togglePlay();');
const navigationIndex = groupButtonSource.indexOf('router.push(`/call/group/');

assert.notEqual(navigationIndex, -1, 'group-call button must navigate to the group-call route');
assert.notEqual(pauseIndex, -1, 'group-call button must pause an active Pulse track');
assert.ok(pauseIndex < navigationIndex, 'Pulse must pause before group-call navigation');

console.log('group call navigation: ok');
