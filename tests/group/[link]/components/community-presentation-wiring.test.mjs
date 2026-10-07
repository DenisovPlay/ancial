import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const listSource = readFileSync(new URL('../../../../app/group/[link]/components/community-channel-list.tsx', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../../../app/group/[link]/components/community-channel-editor.tsx', import.meta.url), 'utf8');
const manageSource = readFileSync(new URL('../../../../app/group/[link]/components/community-manage-modal.tsx', import.meta.url), 'utf8');
const callTileSource = readFileSync(
  new URL('../../../../app/call/group/components/group-call-tile.tsx', import.meta.url),
  'utf8',
);

assert.doesNotMatch(listSource, /◖\)\)|◉/);
assert.match(listSource, /CommunityChannelIcon/);
assert.doesNotMatch(editorSource, /\{channel\.channel_type\}/);
assert.doesNotMatch(editorSource, /communityChannelTypeLabel/);
assert.match(editorSource, /channel\.voice_enabled/);
assert.match(manageSource, /formatCommunityAuditDate/);
assert.match(manageSource, /communityAuditActionLabel\(entry\.action, lang\)/);
assert.doesNotMatch(manageSource, />\{entry\.action\}</);
assert.doesNotMatch(callTileSource, />\s*[●×]\s*</);
assert.match(callTileSource, /name=\{!participant\.mic_enabled \? 'IC-call-mic-off' : 'IC-call-mic'\}/);

console.log('community presentation wiring: ok');
