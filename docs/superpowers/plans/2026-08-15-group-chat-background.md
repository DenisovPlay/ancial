# Group Chat Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authorized managers to upload or clear the shared background of ordinary group chats and community channels from the existing «Изменить чат» screen.

**Architecture:** Keep `msg_dialogs.img` as the canonical shared background. Extend the existing background endpoint with explicit group authorization and safe clear semantics, then reuse the personal-chat background cards inside `GroupInfoModal`. Propagate the returned background into the active dialog and dialog list immediately, followed by the existing metadata refresh.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, PHP 8, MySQLi.

## Global Constraints

- Ordinary group managers are active participants whose role is `owner` or `admin`.
- Community channel managers require effective `manage_channels` permission for that dialog.
- Personal-dialog behavior remains available to either participant.
- Use existing `uploadImage`, `useNotification`, `Modal`, localization dictionaries and Zypo design tokens.
- Do not add a database migration or a separate role permission.

---

### Task 1: Secure background endpoint

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/messages/dialog-background.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/messages/UpdateBackground.php`
- Test: `php-v2-api/tests/dialog-background-permissions.test.php`

**Interfaces:**
- Produces: `zypo_dialog_background_access(array $dialog, ?array $participant, bool $communityMember, bool $communityCanManage, int $userId): bool`.
- Produces: endpoint input `{ dialog_id, image_url, clear }` with legacy `diid/img` query compatibility.
- Produces: `{ success: true, data: { image_url: string }, error: null }`.

- [ ] **Step 1: Write permission tests** for direct participants, ordinary group owner/admin/member and community `manage_channels` allow/deny cases.
- [ ] **Step 2: Run `php php-v2-api/tests/dialog-background-permissions.test.php`** and verify failure because the helper does not exist.
- [ ] **Step 3: Implement the pure access helper** with direct-dialog participant checks and group role/community permission checks.
- [ ] **Step 4: Rewrite endpoint authorization** using prepared statements, active participant lookup, `zypo_community_membership`, `zypo_community_can(..., 'manage_channels', $dialogId)`, explicit clear handling and HTTP(S) URL validation.
- [ ] **Step 5: Run the permission test and `php -l`** for both PHP files.

### Task 2: Group edit background UI

**Files:**
- Modify: `app/messages/components/group-info-modal.tsx`
- Modify: `app/messages/messages-content.tsx`
- Modify: `app/lib/api-v2.ts`
- Modify: `app/messages/lib/messages-shared.tsx`
- Test: `app/messages/components/group-background-management.test.mjs`

**Interfaces:**
- `GroupInfoModal` consumes `background?: string`.
- `GroupInfoModal.onGroupUpdated` emits `{ avatar?: string; title?: string; background?: string }`.
- `AncialAPI.updateDialogBackground(dialogId, imageUrl)` sends JSON POST and uses `clear: imageUrl === ''`.

- [ ] **Step 1: Write a failing UI contract test** proving the edit view exposes upload/clear controls only under `canManageChannel` and reports background through `onGroupUpdated`.
- [ ] **Step 2: Run the test** and verify the missing group-background controls fail it.
- [ ] **Step 3: Add modal state and handlers** using `uploadImage`, the secured endpoint, loading state, toast errors and the same preview cards/classes as personal chat settings.
- [ ] **Step 4: Pass the current background from `messages-content`** and update both `selectedDialog` and the matching dialog-list row before metadata refresh.
- [ ] **Step 5: Add typed `background`/`bg` dialog fields** where required and run the focused test plus TypeScript.

### Task 3: Regression verification

**Files:**
- Test: all existing `app/**/*.test.mjs`
- Test: all existing `php-v2-api/tests/*.test.php`

- [ ] **Step 1: Run all Node and PHP tests** and require zero failures.
- [ ] **Step 2: Run PHP lint** on the endpoint and helper.
- [ ] **Step 3: Run `npx tsc --noEmit` and targeted ESLint** for the new/modified focused modules.
- [ ] **Step 4: Run `npm run build`** and require successful generation of all routes.
- [ ] **Step 5: Review `git diff --check` and the final diff** for unrelated changes; do not push.
