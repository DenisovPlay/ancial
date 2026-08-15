# Community Chat Member Role Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the highest non-member community role beside each participant in a community channel's information modal.

**Architecture:** `GetDialog.php` enriches its existing active-member payload with one optional `community_role`, selected by a small tested PHP helper. The client renders that already-resolved role with localized system names and a sanitized role color, avoiding any additional request or loading state.

**Tech Stack:** PHP 8.4, MySQL, Next.js 16.2.1, React 19.2.4, TypeScript, Tailwind CSS 4, Node.js assertion tests.

## Global Constraints

- Work directly in the existing `main` workspace because the user explicitly requested it; do not create a branch or worktree.
- Do not push or synchronize with GitHub.
- Show exactly one highest role and never show the base `member` role.
- Use localization keys from `app/locales/ru.ts` and `app/locales/en.ts`; no language ternaries.
- Preserve chat membership roles for authorization and moderation.

---

### Task 1: Resolve the display role in the dialog API

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/communities/member-role-badges.php`
- Create: `php-v2-api/tests/community-member-role-badges.test.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/messages/GetDialog.php`

**Interfaces:**
- Consumes: role rows shaped as `user_id`, `id`, `name`, `color`, `position`, and `system_key`, plus the community owner ID.
- Produces: `zypo_community_select_display_roles(array $rows, int $ownerId): array<int, array>` and optional `members[*].community_role` payloads.

- [ ] **Step 1: Write the failing PHP behavior test**

Cover these literal expectations: owner overrides every assignment; lowest `position` wins; lower `id` breaks equal-position ties; `system_key=member` is omitted; users without a significant assignment are absent.

- [ ] **Step 2: Run the test and verify RED**

Run: `php php-v2-api/tests/community-member-role-badges.test.php`

Expected: failure because `member-role-badges.php` and its selector do not exist.

- [ ] **Step 3: Implement the pure selector**

Normalize IDs and positions, discard invalid users and the base member role, sort deterministically by `position` then `id`, retain the first role per user, and finally replace the owner's result with:

```php
[
    'id' => null,
    'name' => 'Владелец',
    'color' => '#a855f7',
    'position' => PHP_INT_MIN,
    'system_key' => 'owner',
    'is_owner' => true,
]
```

- [ ] **Step 4: Run the PHP test and verify GREEN**

Run: `php php-v2-api/tests/community-member-role-badges.test.php`

Expected: `community member role badges: ok` and exit code 0.

- [ ] **Step 5: Enrich `GetDialog.php`**

Select `community.creator AS community_creator_id` with the dialog. For accessible community group dialogs, query role assignments only for active `msg_participants`, call the selector, and attach a matched role to the corresponding `groupMembers` entry. Do not expose assignments for users outside this dialog.

- [ ] **Step 6: Check PHP syntax and rerun the behavior test**

Run:

```bash
php -l php-v2-api/backend.ru.zypo/api/V2/messages/GetDialog.php
php -l php-v2-api/backend.ru.zypo/modules/communities/member-role-badges.php
php php-v2-api/tests/community-member-role-badges.test.php
```

Expected: no syntax errors and the test passes.

### Task 2: Render one localized colored badge

**Files:**
- Create: `app/messages/lib/community-role.ts`
- Create: `app/messages/lib/community-role.test.ts`
- Modify: `app/messages/lib/messages-shared.tsx`
- Modify: `app/messages/components/group-info-modal.tsx`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`

**Interfaces:**
- Consumes: optional `CommunityDisplayRole` from `DialogMeta.members`.
- Produces: `getCommunityRoleLabel(role, lang)` and `getCommunityRoleBadgeStyle(role)` for the participant row.

- [ ] **Step 1: Write the failing TypeScript behavior test**

Assert that `owner`, `administrator`, and `editor` use localized literals, a custom role uses its stored name, `member` returns `null`, and malformed colors fall back to `#a855f7` while valid six-digit hex colors are retained.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --experimental-strip-types app/messages/lib/community-role.test.ts`

Expected: module-not-found failure because `community-role.ts` does not exist.

- [ ] **Step 3: Implement the client role utilities and shared types**

Define `CommunityDisplayRole`, extend both `GroupMember` declarations with optional `community_role`, map system keys through `lang.community_owner`, `lang.role_admin`, and new `lang.role_editor`, and return no label for `member`.

- [ ] **Step 4: Run the TypeScript behavior test and verify GREEN**

Run: `node --experimental-strip-types app/messages/lib/community-role.test.ts`

Expected: `community role badge: ok` and exit code 0.

- [ ] **Step 5: Replace the chat-owner badge with the community-role badge**

In community channels, render one right-aligned compact badge beside the account name using the sanitized foreground, translucent background, and border colors. Keep the existing chat-owner badge only for ordinary group chats without `community_id`. Preserve the moderation button and prevent layout overflow with `min-w-0`, `shrink-0`, and truncation.

- [ ] **Step 6: Add translations**

Add `role_editor: "Редактор"` to Russian and `role_editor: "Editor"` to English. Reuse `community_owner` and `role_admin` for the other system labels.

- [ ] **Step 7: Run focused frontend checks**

Run:

```bash
node --experimental-strip-types app/messages/lib/community-role.test.ts
node app/messages/components/group-info-modal-layout.test.mjs
npx eslint app/messages/components/group-info-modal.tsx app/messages/lib/community-role.ts app/messages/lib/messages-shared.tsx app/locales/ru.ts app/locales/en.ts
npx tsc --noEmit
```

Expected: all commands exit 0.

### Task 3: Final integration verification

**Files:**
- Verify all files changed by Tasks 1 and 2.

**Interfaces:**
- Consumes: the final backend payload and frontend renderer.
- Produces: evidence that the feature is syntactically and statically valid without deployment.

- [ ] **Step 1: Run the complete focused verification**

Run both behavior tests, both PHP syntax checks, the existing modal layout regression test, focused ESLint, `npx tsc --noEmit`, and `git diff --check`.

- [ ] **Step 2: Inspect the final diff and requirements**

Confirm one role only, owner priority, `member` suppression, localized system labels, custom role colors, no extra client request, no unrelated changes, and no remote Git operation.

- [ ] **Step 3: Commit locally**

Stage only the feature files and commit with `feat: show community roles in channel members`. Do not push.
