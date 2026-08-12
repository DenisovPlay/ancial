import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const listSource = readFileSync(new URL('./community-channel-list.tsx', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('./community-channel-editor.tsx', import.meta.url), 'utf8');
const manageSource = readFileSync(new URL('./community-manage-modal.tsx', import.meta.url), 'utf8');
const callTileSource = readFileSync(
  new URL('../../../call/group/components/group-call-tile.tsx', import.meta.url),
  'utf8',
);

assert.doesNotMatch(listSource, /◖\)\)|◉/);
assert.match(listSource, /CommunityChannelIcon/);
assert.doesNotMatch(editorSource, /\{channel\.channel_type\}/);
assert.match(editorSource, /communityChannelTypeLabel/);
assert.match(manageSource, /formatCommunityAuditDate/);
assert.doesNotMatch(callTileSource, />\s*[●×]\s*</);
assert.match(callTileSource, /MicrophoneStatusIcon/);

console.log('community presentation wiring: ok');
