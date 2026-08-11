# Community UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native community confirmations, make group calls safe-area aware, use project SVG icons, and localize channel types and audit dates.

**Architecture:** Pure presentation decisions live in a small `community-presentation.ts` helper module and a reusable `CommunityChannelIcon` component. Existing editors keep their API functions but gate destructive actions through the shared `ConfirmDeleteModal`. Group-call layout changes remain isolated to its route files.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, Tailwind CSS v4, Node assert tests.

## Global Constraints

- Use the existing Zypo `Modal`/`ConfirmDeleteModal`, `/icons.svg`, `useAuth`, and localization dictionaries.
- Keep the existing `rounded-3xl`, zinc, purple, `p-3`, `gap-3`, `duration-300`, and `active:scale-95` visual language.
- Do not add dependencies or new Service Worker assets.
- Do not change the one-to-one call design or route.
- Keep all commits local; never push or synchronize with GitHub.

---

### Task 1: Community presentation helpers and SVG channel icon

**Files:**
- Create: `app/group/[link]/lib/community-presentation.ts`
- Create: `app/group/[link]/lib/community-presentation.test.mjs`
- Create: `app/group/[link]/components/community-channel-icon.tsx`

**Interfaces:**
- Produces: `communityChannelIconId(type: CommunityChannelType): 'IC-chats' | 'IC-news' | 'IC-call'`.
- Produces: `communityChannelTypeLabel(type: CommunityChannelType, labels: Record<CommunityChannelType, string>): string`.
- Produces: `formatCommunityAuditDate(value: string, languageName?: string): string`.
- Produces: `CommunityChannelIcon({ type, className? })` using `/icons.svg#<id>` and `aria-hidden="true"`.

- [ ] **Step 1: Write the failing helper test**

```js
import assert from 'node:assert/strict';
import {
  communityChannelIconId,
  communityChannelTypeLabel,
  formatCommunityAuditDate,
} from './community-presentation.ts';

assert.equal(communityChannelIconId('text'), 'IC-chats');
assert.equal(communityChannelIconId('announcement'), 'IC-news');
assert.equal(communityChannelIconId('voice'), 'IC-call');
assert.equal(communityChannelTypeLabel('voice', {
  text: 'Текстовый канал', announcement: 'Канал объявлений', voice: 'Голосовой канал',
}), 'Голосовой канал');
assert.equal(formatCommunityAuditDate('not-a-date', 'ru'), 'not-a-date');
assert.match(formatCommunityAuditDate('2026-08-12T10:30:00Z', 'en'), /2026/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node app/group/'[link]'/lib/community-presentation.test.mjs`

Expected: FAIL because `community-presentation.ts` does not exist.

- [ ] **Step 3: Implement the minimal helpers**

Use exhaustive records keyed by `CommunityChannelType`. Map `langname === 'en'` to `en-US`, otherwise use `ru-RU`. Return the original value when `Date#getTime()` is not finite.

- [ ] **Step 4: Add `CommunityChannelIcon`**

Render a fixed-square SVG with `<use href={`/icons.svg#${communityChannelIconId(type)}`} />`. Accept an optional class string and keep the default compatible with the current 28px channel-icon slot.

- [ ] **Step 5: Run the helper test and verify GREEN**

Run: `node app/group/'[link]'/lib/community-presentation.test.mjs`

Expected: PASS with `community presentation: ok`.

### Task 2: Zypo confirmation modals for destructive community actions

**Files:**
- Modify: `app/group/[link]/components/community-channel-editor.tsx`
- Modify: `app/group/[link]/components/community-role-editor.tsx`
- Modify: `app/group/[link]/components/community-moderation.tsx`
- Create: `app/group/[link]/components/community-confirmations.test.mjs`

**Interfaces:**
- Consumes: existing `ConfirmDeleteModal` props: `isOpen`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`, `cancelLabel`.
- Produces: pending-action state local to each editor; no public component API changes.

- [ ] **Step 1: Write a failing source regression test**

Read all three components with `readFileSync` and assert:

```js
assert.doesNotMatch(combinedSource, /window\.confirm/);
assert.match(channelSource, /ConfirmDeleteModal/);
assert.match(roleSource, /ConfirmDeleteModal/);
assert.match(moderationSource, /ConfirmDeleteModal/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node app/group/'[link]'/components/community-confirmations.test.mjs`

Expected: FAIL because all three files still call `window.confirm`.

- [ ] **Step 3: Refactor channel and category deletion**

Store `{ kind: 'channel' | 'category'; id: number } | null`. Clicking delete only sets this state. Confirming snapshots the value, clears it, and invokes a private `performDelete` function containing the existing API call, refresh, notification, and error handling.

- [ ] **Step 4: Refactor role deletion**

Store a pending role ID. Clicking delete opens `ConfirmDeleteModal`; confirming clears state and invokes the existing role mutation. Use localized `delete` and `cancel` labels.

- [ ] **Step 5: Refactor kick and ban confirmation**

Store `{ action: 'kick' | 'ban'; userId: number } | null`. Mute/unmute remains immediate. Confirming clears state and calls the existing moderation function with a `confirmed` path that cannot reopen the modal.

- [ ] **Step 6: Run the confirmation test and verify GREEN**

Run: `node app/group/'[link]'/components/community-confirmations.test.mjs`

Expected: PASS with `community confirmations: ok`.

### Task 3: Safe-area-aware group call layout

**Files:**
- Modify: `app/call/group/[hash]/group-call-client.tsx`
- Modify: `app/call/group/[hash]/page.tsx`
- Create: `app/call/group/group-call-layout.test.mjs`

**Interfaces:**
- Produces no JavaScript API changes; only route layout classes.

- [ ] **Step 1: Write the failing layout regression test**

Read both route files and assert that the page no longer contains `h-screen`, the root contains `min-h-dvh`, the header contains `safe-area-inset-top`, and the controls contain `safe-area-inset-bottom`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node app/call/group/group-call-layout.test.mjs`

Expected: FAIL on `h-screen` and missing safe-area utilities.

- [ ] **Step 3: Apply the mobile viewport layout**

Use `min-h-dvh` for the fallback and full-screen states. Replace fixed top and bottom padding with Tailwind arbitrary calculations using `max(env(safe-area-inset-*,0px),0.75rem)`. Keep the existing black call canvas, grid, z-indexes, and control sizes unchanged.

- [ ] **Step 4: Run the layout test and verify GREEN**

Run: `node app/call/group/group-call-layout.test.mjs`

Expected: PASS with `group call layout: ok`.

### Task 4: Wire icons, localized channel types, audit dates, and microphone state

**Files:**
- Modify: `app/group/[link]/components/community-channel-list.tsx`
- Modify: `app/group/[link]/components/community-channel-view.tsx`
- Modify: `app/group/[link]/components/community-channel-editor.tsx`
- Modify: `app/group/[link]/components/community-manage-modal.tsx`
- Modify: `app/call/group/components/group-call-tile.tsx`
- Create: `app/group/[link]/components/community-presentation-wiring.test.mjs`

**Interfaces:**
- Consumes: `CommunityChannelIcon`, `communityChannelTypeLabel`, and `formatCommunityAuditDate` from Task 1.
- Produces: no public API changes beyond `CommunityChannelView` continuing to accept its existing `typeLabel` prop.

- [ ] **Step 1: Write the failing wiring regression test**

Assert source no longer contains `◖))`, the editor no longer renders `{channel.channel_type}`, audit entries call `formatCommunityAuditDate`, and the group-call tile contains an SVG microphone icon instead of `●`/`×`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node app/group/'[link]'/components/community-presentation-wiring.test.mjs`

Expected: FAIL on the legacy text symbols and raw API values.

- [ ] **Step 3: Replace channel symbols**

Use `CommunityChannelIcon` in both the list and selected-channel card. Keep existing containers, selection colors, sizing, and responsive behavior.

- [ ] **Step 4: Localize editor types**

Build the label record from `lang.community_channel_text`, `lang.community_channel_announcement`, and `lang.community_channel_voice`, then render `communityChannelTypeLabel(channel.channel_type, labels)`.

- [ ] **Step 5: Format audit dates**

Call `formatCommunityAuditDate(entry.created_at, lang?.langname)` at render time. Preserve username, separator, and existing card layout.

- [ ] **Step 6: Replace microphone text marks**

Render a 16px SVG microphone glyph with an additional diagonal path when muted. Keep the existing green/red circular status and accessible `title`.

- [ ] **Step 7: Run the wiring and helper tests and verify GREEN**

Run: `node app/group/'[link]'/components/community-presentation-wiring.test.mjs && node app/group/'[link]'/lib/community-presentation.test.mjs`

Expected: both PASS.

### Task 5: Full verification and local commit

**Files:**
- Verify all files changed in Tasks 1–4.

- [ ] **Step 1: Run focused regression tests**

```bash
node app/group/'[link]'/components/community-confirmations.test.mjs
node app/group/'[link]'/components/community-presentation-wiring.test.mjs
node app/group/'[link]'/lib/community-presentation.test.mjs
node app/group/'[link]'/lib/community-cache.test.mjs
node app/group/'[link]'/lib/community-permissions.test.mjs
node app/call/group/group-call-layout.test.mjs
node app/call/group/lib/group-call-state.test.mjs
```

Expected: every test prints its `ok` marker.

- [ ] **Step 2: Run static checks**

```bash
npx eslint app/group/'[link]'/components app/group/'[link]'/lib/community-presentation.ts app/call/group
npx tsc --noEmit
git diff --check
```

Expected: exit code 0.

- [ ] **Step 3: Run React diagnostics**

Run: `npx react-doctor@latest --verbose --scope changed --base origin/main`

Expected: no new error attributable to these four fixes; triage warnings against source before changing code.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js production build succeeds and all routes generate.

- [ ] **Step 5: Commit locally**

```bash
git add app/group/'[link]' app/call/group docs/superpowers/plans/2026-08-12-community-ui-polish.md
git commit -m "fix: polish community interface"
```

Expected: local `main` advances; no push or remote operation occurs.
