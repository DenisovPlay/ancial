# Community Channel Membership Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require real chat membership before opening community text or voice channels and add a community link to linked-chat menus.

**Architecture:** Keep community permissions for channel discovery, then reuse `JoinPublic.php` as the membership transition before navigation. Require `msg_participants` at every dialog/call boundary and return only the community handle for navigation.

**Tech Stack:** PHP 8.4, MariaDB, Next.js 16, React 19, TypeScript, Tailwind CSS.

## Global Constraints

- Do not push or synchronize with GitHub.
- Use existing localization files and notification context.
- Never expose an invite code to unauthorized users.

---

### Task 1: Membership contract

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/Structure.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/messages/GetDialog.php`
- Modify: `php-v2-api/backend.ru.zypo/ws-server.php`
- Test: `php-v2-api/tests/community_channel_membership_test.php`

- [ ] Add a failing source-contract test for active participant enforcement and channel membership metadata.
- [ ] Run the test and verify failure.
- [ ] Return `is_joined` per channel and require active membership in dialog/call authorization.
- [ ] Run the backend tests and PHP syntax checks.

### Task 2: Join before navigation

**Files:**
- Modify: `app/group/[link]/components/community-channel-shell.tsx`
- Modify: `app/group/[link]/lib/community-types.ts`
- Modify: `app/group/[link]/components/community-management-ui.test.mjs`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`

- [ ] Add a failing UI contract test for text and voice join gating.
- [ ] Run the test and verify failure.
- [ ] Call `joinPublicChat`, handle `joined` and `requested`, then navigate only after membership is active.
- [ ] Run UI tests and TypeScript.

### Task 3: Open linked community

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/api/V2/messages/GetDialog.php`
- Modify: `app/messages/lib/messages-shared.tsx`
- Modify: `app/messages/messages-content.tsx`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`
- Test: `app/messages/components/community-dialog-menu.test.mjs`

- [ ] Add a failing menu contract test.
- [ ] Run the test and verify failure.
- [ ] Return `community_link` and render the localized dropdown action for linked group chats.
- [ ] Run TypeScript, React Doctor, and all focused regressions.
