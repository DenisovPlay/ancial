import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./community-channel-editor.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(source, /setChannelType|community_channel_announcement|community_channel_voice/, 'channel type selector must be removed');
assert.match(source, /useState\(true\)/, 'group calls must default to enabled');
assert.match(source, /voice_enabled: voiceEnabled/, 'channel payload must send voice_enabled');
assert.match(source, /'create' \| 'update'/, 'existing channels must be editable');
assert.match(source, /COMMUNITY_CHANNEL_PERMISSION_NAMES/, 'all channel permissions must use the shared catalog');
assert.match(source, /'inherit' \| 'allow' \| 'deny'/, 'channel overrides must be tri-state');

console.log('community channel editor: ok');
