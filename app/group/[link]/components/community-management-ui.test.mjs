import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowUncategorizedHeading } from '../lib/community-presentation.ts';

const moderationSource = readFileSync(new URL('./community-moderation.tsx', import.meta.url), 'utf8');
const managementSource = readFileSync(new URL('./community-manage-modal.tsx', import.meta.url), 'utf8');

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

console.log('community management UI: ok');
