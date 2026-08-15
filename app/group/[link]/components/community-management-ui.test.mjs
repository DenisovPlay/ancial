import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowUncategorizedHeading } from '../lib/community-presentation.ts';

const moderationSource = readFileSync(new URL('./community-moderation.tsx', import.meta.url), 'utf8');
const managementSource = readFileSync(new URL('./community-manage-modal.tsx', import.meta.url), 'utf8');
const groupPageSource = readFileSync(new URL('../group-content.tsx', import.meta.url), 'utf8');
const channelShellSource = readFileSync(new URL('./community-channel-shell.tsx', import.meta.url), 'utf8');

assert.match(moderationSource, /import \{ Dropdown, DropdownItem \}/, 'member actions must use the shared dropdown');
assert.match(moderationSource, /triggerIcon="IC-more"/, 'member actions need one compact more trigger');
assert.match(moderationSource, /community_member_actions/, 'the actions trigger needs a localized accessible label');
assert.doesNotMatch(moderationSource, /className="flex flex-wrap items-center gap-1\.5"/, 'moderation actions must not stay permanently expanded');

assert.match(managementSource, /useDragScroll\(\{ speed: 2 \}\)/, 'management tabs must use Feed drag scrolling');
assert.match(managementSource, /ref=\{tabsScrollRef\}/, 'management tabs must attach the drag-scroll ref');
assert.match(managementSource, /drag-scroll viewport/, 'management tabs must hide platform scrollbars');

assert.equal(shouldShowUncategorizedHeading(0, 4), false, 'all-uncategorized channel lists need no redundant heading');
assert.equal(shouldShowUncategorizedHeading(2, 2), true, 'mixed channel lists need an uncategorized heading');
assert.equal(shouldShowUncategorizedHeading(2, 0), false, 'lists without uncategorized channels need no heading');

assert.match(groupPageSource, /flag\(groupData\.is_community_member\)/, 'role-only editors must see community channels');
assert.doesNotMatch(groupPageSource, /groupData\.public_chats\?\.length/, 'linked channels must not render in a duplicate public-chat block');
assert.doesNotMatch(
  groupPageSource,
  /<div className="flex flex-col md:flex-row gap-3 items-center shrink-0">\s*\{isAuthenticated/,
  'guest pages must not render an empty action wrapper',
);
assert.match(channelShellSource, /AncialAPI\.joinPublicChat/, 'community channels must join before navigation');
assert.match(channelShellSource, /result\.status === 'requested'/, 'request-only channels must stay on the community page');
assert.doesNotMatch(channelShellSource, /channel\.channel_type === 'voice'/, 'all channels must open messages');
assert.doesNotMatch(channelShellSource, /CommunityChannelView/, 'community pages must not duplicate the selected channel in a detail card');
assert.match(channelShellSource, /onSelect=\{openChannel\}/, 'compact channel rows must perform the existing join-and-open flow directly');
assert.match(managementSource, /width="xl"/, 'community management needs the shared wide desktop workspace');
assert.match(managementSource, /import Modal from/, 'community management must use the shared modal shell');
assert.match(managementSource, /hidden w-56 shrink-0 flex-col[^\"]*lg:flex/, 'desktop management needs a persistent navigation rail');
assert.match(managementSource, /lg:hidden/, 'mobile management must retain compact horizontal tabs');
assert.match(managementSource, /managementView/, 'management tools must open as internal workspaces');
assert.match(groupPageSource, /initialTab="community"/, 'edit must open unified management on community tab');
assert.match(groupPageSource, /<CommunityManageModal/, 'page must own unified management modal');
assert.doesNotMatch(groupPageSource, /isEditModalOpen/, 'legacy edit modal state must be removed');
assert.doesNotMatch(channelShellSource, /CommunityManageModal/, 'channel shell must not own management UI');
assert.doesNotMatch(channelShellSource, /community_channel_manage/, 'channel block must not render manage button');
assert.match(managementSource, /resolvedActiveTab === 'community'/, 'management modal must render only an authorized community settings tab');

console.log('community management UI: ok');
