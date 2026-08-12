import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync(new URL('./[hash]/page.tsx', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('./[hash]/group-call-client.tsx', import.meta.url), 'utf8');
const tileSource = readFileSync(new URL('./components/group-call-tile.tsx', import.meta.url), 'utf8');
const ruLocale = readFileSync(new URL('../../locales/ru.ts', import.meta.url), 'utf8');
const enLocale = readFileSync(new URL('../../locales/en.ts', import.meta.url), 'utf8');

assert.doesNotMatch(pageSource, /\bh-screen\b/);
assert.match(pageSource, /min-h-dvh/);
assert.match(clientSource, /min-h-dvh/);
assert.match(clientSource, /safe-area-inset-top/);
assert.match(clientSource, /safe-area-inset-bottom/);
assert.match(clientSource, /focusedParticipantId/);
assert.match(clientSource, /resolveFocusedParticipantId/);
assert.match(tileSource, /participant\.screen_enabled \? 'object-contain' : 'object-cover'/);
assert.match(tileSource, /voice_focus_video/);
assert.match(tileSource, /voice_return_to_grid/);
assert.match(ruLocale, /"voice_focus_video"/);
assert.match(ruLocale, /"voice_return_to_grid"/);
assert.match(enLocale, /"voice_focus_video"/);
assert.match(enLocale, /"voice_return_to_grid"/);
assert.match(clientSource, /call\.cameras\.length > 1/);
assert.match(clientSource, /ScreenIcon active=/);
assert.match(clientSource, /SpeakerIcon off=/);

const hookSource = readFileSync(new URL('./[hash]/use-group-call.ts', import.meta.url), 'utf8');
assert.match(hookSource, /signalQueuesRef/);
assert.match(hookSource, /recoveryTimersRef/);
assert.match(hookSource, /videoWatchdogsRef/);
assert.match(hookSource, /kind: 'restart'/);
assert.match(hookSource, /isGroupCallOfferer/);

console.log('group call layout: ok');
