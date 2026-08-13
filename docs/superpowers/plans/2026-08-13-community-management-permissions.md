# Unified Community Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Объединить редактирование сообщества с новой модалкой управления, свести каналы к одной сущности с независимыми звонками и сделать каталог ролей и разрешений полностью рабочим на клиенте и сервере.

**Architecture:** Чистая модель разрешений остаётся в `modules/communities/permissions.php`, а все изменяющие PHP endpoints используют общий permission context и подготовленные запросы. Клиент поднимает загрузку структуры и состояние управления на страницу сообщества, оставляя shell каналов отображающим компонентом; отдельные редакторы отвечают за данные сообщества, каналы и роли. Старые типы каналов читаются совместимо, но новые записи всегда канонизируются в `text`.

**Tech Stack:** PHP 8.4, MySQLi, Next.js 16.2.1 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Node.js native test runner/assertions.

## Global Constraints

- Работать локально в текущей ветке `main`; не выполнять `push`, синхронизацию GitHub или создание PR.
- Не изменять дамп базы данных; схема для этой задачи не требует новых таблиц или колонок.
- Не удалять существующие сообщества, каналы, роли, назначения, сообщения или историю звонков.
- Все новые строки добавить в `app/locales/ru.ts` и `app/locales/en.ts`; читать их только через `useAuth().lang`.
- Не использовать inline-проверки языка и не называть локальное состояние `lang`.
- Использовать дизайн-токены Zypo: `rounded-3xl`, `gap-3`, `p-3`, `duration-300`, `cursor-pointer`, `active:scale-95`.
- Комментарии от имени сообщества и отправка файлов не входят в функциональность.
- Перед изменением React/Next.js файлов прочитать `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` и `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`, если второй файл существует; при несовпадении пути найти актуальную документацию через `rg --files node_modules/next/dist/docs`.

---

### Task 1: Canonical permission catalog and persistent system roles

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/modules/communities/permissions.php`
- Modify: `php-v2-api/backend.ru.zypo/modules/communities/http.php`
- Create: `php-v2-api/tests/community-permissions.test.php`

**Interfaces:**
- Produces: `zypo_community_permission_names(): array` without `attach_files`.
- Produces: `zypo_community_channel_permission_names(): array` for channel override UI/API validation.
- Produces: `zypo_community_is_owner(mysqli $conn, int $communityId, int $userId): bool`.
- Changes: `zypo_community_ensure_system_roles()` inserts missing roles but never overwrites permissions of existing roles.

- [ ] **Step 1: Write the failing pure-PHP permission tests**

Create a CLI test that requires `permissions.php` and asserts:

```php
<?php
declare(strict_types=1);

require __DIR__ . '/../backend.ru.zypo/modules/communities/permissions.php';

function expect(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

$names = zypo_community_permission_names();
expect(!in_array('attach_files', $names, true), 'attach_files must be removed');
expect(in_array('manage_community', $names, true), 'manage_community must remain');
expect(zypo_community_decode_permission_map(['attach_files' => true]) === [], 'legacy unknown keys must be ignored');
expect(zypo_community_default_member_permissions() === [
    'view_channel' => true,
    'send_messages' => true,
    'add_reactions' => true,
    'connect_voice' => true,
    'speak_voice' => true,
], 'member defaults must only contain real capabilities');
expect(zypo_community_channel_permission_names() === [
    'view_channel', 'send_messages', 'add_reactions', 'mention_everyone',
    'connect_voice', 'speak_voice', 'manage_messages', 'manage_voice',
], 'channel permission catalog mismatch');
expect(zypo_community_channel_message_denial([], ['view_channel' => true, 'send_messages' => true], null, null, true) === null, 'attachments have no dedicated permission');
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `php php-v2-api/tests/community-permissions.test.php`

Expected: FAIL because `attach_files` still exists and `zypo_community_channel_permission_names()` is undefined.

- [ ] **Step 3: Implement the canonical catalogs and remove attachment denial**

Remove `attach_files` from known/default permissions, add the exact ordered channel catalog above, and remove `hasAttachment` permission rejection from `zypo_community_channel_message_denial()` while keeping the parameter for call-site compatibility.

- [ ] **Step 4: Stop resetting system-role permissions**

Change `zypo_community_ensure_system_roles()` so `ON DUPLICATE KEY UPDATE` only reasserts `is_system=1` and does not assign `permissions=VALUES(permissions)`. Add `zypo_community_is_owner()` using a prepared `SELECT creator FROM groups WHERE id=?` comparison.

- [ ] **Step 5: Run PHP tests and lint changed files**

Run:

```bash
php php-v2-api/tests/community-permissions.test.php
php -l php-v2-api/backend.ru.zypo/modules/communities/permissions.php
php -l php-v2-api/backend.ru.zypo/modules/communities/http.php
```

Expected: all commands succeed.

- [ ] **Step 6: Commit locally**

```bash
git add php-v2-api/backend.ru.zypo/modules/communities/permissions.php php-v2-api/backend.ru.zypo/modules/communities/http.php php-v2-api/tests/community-permissions.test.php
git commit -m "fix: make community permission catalog persistent"
```

### Task 2: Permission-aware community identity update endpoint

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/communities/group-info.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/groups/UpdateInfo.php`
- Create: `php-v2-api/tests/community-group-info.test.php`

**Interfaces:**
- Produces: `zypo_community_group_link(mixed $value): string`.
- Produces: `zypo_community_group_text(mixed $value, int $maxLength): string`.
- Consumes: `zypo_community_is_owner()` and `zypo_community_require_permission()`.
- Endpoint remains compatible with form-urlencoded `gid`, `name`, `desk`, `slnk` and query parameters `img`, `cover`.

- [ ] **Step 1: Write failing validation tests**

Test exact normalization and limits without a database:

```php
expect(zypo_community_group_link('  My_Group!  ') === 'my_group', 'link normalization failed');
expect(zypo_community_group_link(str_repeat('a', 33)) === '', 'links longer than 32 must be rejected');
expect(zypo_community_group_text('<b>Name</b>', 80) === 'Name', 'markup must be stripped');
expect(zypo_community_group_text('   ', 80) === '', 'blank text must stay blank');
```

- [ ] **Step 2: Run the test and verify the module is missing**

Run: `php php-v2-api/tests/community-group-info.test.php`

Expected: FAIL because `group-info.php` or its functions do not exist.

- [ ] **Step 3: Implement validation helpers**

Normalize links to lowercase `[a-z0-9_]`, cap at 32 characters, and strip/trim group text with explicit `mb_substr` limits. Return an empty string for invalid overlong links so the endpoint can emit `422`.

- [ ] **Step 4: Rewrite metadata updates around shared permissions**

For `name`, `desk`, or `slnk`, require owner or `manage_community`; validate nonempty name when supplied, check link uniqueness with `SELECT id FROM groups WHERE slnk=? AND id<>?`, update only keys present in the request, and audit `community.update`. Use `403`, `409`, and `422` as specified.

- [ ] **Step 5: Preserve owner-only media updates**

For `img` and `cover`, require `zypo_community_is_owner()` regardless of `manage_community`, validate that the submitted URL is nonempty HTTP(S), and update only that column. Do not mix media authorization with identity authorization.

- [ ] **Step 6: Verify helper tests and PHP syntax**

Run:

```bash
php php-v2-api/tests/community-group-info.test.php
php -l php-v2-api/backend.ru.zypo/modules/communities/group-info.php
php -l php-v2-api/backend.ru.zypo/api/V2/groups/UpdateInfo.php
```

Expected: all commands succeed.

- [ ] **Step 7: Commit locally**

```bash
git add php-v2-api/backend.ru.zypo/modules/communities/group-info.php php-v2-api/backend.ru.zypo/api/V2/groups/UpdateInfo.php php-v2-api/tests/community-group-info.test.php
git commit -m "feat: authorize community profile editing by permission"
```

### Task 3: Canonical channel backend with independent calls

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/Channels.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/Structure.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/ChannelPermissions.php`
- Modify: `php-v2-api/backend.ru.zypo/modules/communities/permissions.php`
- Create: `php-v2-api/tests/community-channel-model.test.php`

**Interfaces:**
- Channel mutations consume `voice_enabled: bool` independently and always store `channel_type='text'`.
- Structure responses expose legacy rows as `channel_type: 'text'` while preserving `voice_enabled` and `read_only`.
- Channel override endpoint accepts only names returned by `zypo_community_channel_permission_names()`.

- [ ] **Step 1: Add a source-level backend regression test**

Use `file_get_contents()` assertions to require that `Channels.php` reads `voice_enabled`, inserts/updates a literal canonical `text`, and no longer accepts `announcement`/`voice` branches; require that `Structure.php` assigns response `channel_type` to `text`.

- [ ] **Step 2: Run the test and verify legacy type logic fails it**

Run: `php php-v2-api/tests/community-channel-model.test.php`

Expected: FAIL on the existing three-type validation and derived voice flag.

- [ ] **Step 3: Canonicalize create and update**

Read `voice_enabled` with a true default on create and the current stored value as fallback on update. Keep `read_only`, slow mode and category independent. Always write `channel_type='text'`; verify update affected a channel belonging to the requested community.

- [ ] **Step 4: Normalize reads without destructive SQL**

In `Structure.php`, return every channel as `channel_type='text'`. Do not rewrite old rows in bulk; retain their stored `voice_enabled`, `read_only`, hash, membership, ordering and messages.

- [ ] **Step 5: Restrict channel overrides to relevant permissions**

Decode allow/deny, reject keys outside `zypo_community_channel_permission_names()`, and ensure a permission cannot be true in both maps before saving.

- [ ] **Step 6: Verify tests and syntax**

Run the new test, the Task 1 permission test, and `php -l` on all modified PHP files. Expected: all succeed.

- [ ] **Step 7: Commit locally**

```bash
git add php-v2-api/backend.ru.zypo/api/V2/communities/Channels.php php-v2-api/backend.ru.zypo/api/V2/communities/Structure.php php-v2-api/backend.ru.zypo/api/V2/communities/ChannelPermissions.php php-v2-api/backend.ru.zypo/modules/communities/permissions.php php-v2-api/tests/community-channel-model.test.php
git commit -m "refactor: unify community channel model"
```

### Task 4: Editable role backend with enforced hierarchy

**Files:**
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/Roles.php`
- Modify: `php-v2-api/backend.ru.zypo/api/V2/communities/MemberRoles.php`
- Create: `php-v2-api/tests/community-role-policy.test.php`

**Interfaces:**
- System-role permission updates are owner-only and update only `permissions`.
- Custom-role updates retain hierarchy and permission-subset checks.
- No endpoint can assign a role at or above the actor, except the owner.

- [ ] **Step 1: Write a policy/source regression test**

Assert that `Roles.php` has a distinct `is_system` update branch guarded by `zypo_community_is_owner`, that its SQL updates only `permissions`, and that delete/reorder still contain `is_system=0`. Assert `MemberRoles.php` uses the existing role-below-actor guard.

- [ ] **Step 2: Run the test and verify system-role update is rejected**

Run: `php php-v2-api/tests/community-role-policy.test.php`

Expected: FAIL because all system-role updates currently return `403`.

- [ ] **Step 3: Implement owner-only system permission changes**

In the update action, branch on `is_system`. If system: require owner, decode known permissions, preserve name/color/position/system_key, update only JSON permissions, audit the system key. If custom: retain name/color/position editing, subset checks and hierarchy.

- [ ] **Step 4: Recheck role assignment boundaries**

Keep owner unrestricted. For non-owner `manage_roles`, reject assignment/removal targeting roles not below the actor and reject granting permissions absent from actor effective permissions.

- [ ] **Step 5: Run role policy test and PHP lint**

Expected: both tests and `php -l` succeed.

- [ ] **Step 6: Commit locally**

```bash
git add php-v2-api/backend.ru.zypo/api/V2/communities/Roles.php php-v2-api/backend.ru.zypo/api/V2/communities/MemberRoles.php php-v2-api/tests/community-role-policy.test.php
git commit -m "feat: allow safe system role permission editing"
```

### Task 5: Client contracts, API and localization

**Files:**
- Modify: `app/group/[link]/lib/community-types.ts`
- Modify: `app/lib/api-v2.ts`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`
- Modify: `app/group/[link]/lib/community-permissions.test.mjs`

**Interfaces:**
- `CommunityManagementTab` includes `'community'` first.
- `CommunityChannelType` becomes `'text'`.
- Produces `COMMUNITY_CHANNEL_PERMISSION_NAMES` matching the PHP order.
- `updateGroupInfo()` keeps form/query compatibility; community mutations remain JSON.

- [ ] **Step 1: Update failing client permission tests first**

Change expectations to:

```js
assert.deepEqual(visibleManagementTabs({ manage_community: true }), ['community']);
assert.deepEqual(visibleManagementTabs({
  manage_community: true, manage_channels: true, manage_roles: true,
  manage_members: true, view_audit_log: true,
}), ['community', 'channels', 'roles', 'members', 'link_requests', 'audit']);
assert.deepEqual(COMMUNITY_CHANNEL_PERMISSION_NAMES, [
  'view_channel', 'send_messages', 'add_reactions', 'mention_everyone',
  'connect_voice', 'speak_voice', 'manage_messages', 'manage_voice',
]);
```

Also assert the permission type/source contains no `attach_files` and the channel renderer only has `text: 'messages'`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types 'app/group/[link]/lib/community-permissions.test.mjs'`.

- [ ] **Step 3: Update client types and visible tabs**

Add the community tab, canonical channel type/catalog, and keep validation tolerant of cached legacy strings by normalizing them to `text` in `validateCachedCommunityStructure()`.

- [ ] **Step 4: Add localized labels and descriptions**

Add RU/EN strings for the Community tab, save states, group calls toggle, read-only toggle, edit-role UI, Inherit/Allow/Deny states, permission group headings and a short description for every visible permission. Remove UI use of attachment and old channel-type labels; stale locale keys may remain only if other code still references them.

- [ ] **Step 5: Run permission tests and TypeScript**

Run the test above and `npx tsc --noEmit`. Expected: both succeed before moving to UI tasks.

- [ ] **Step 6: Commit locally**

```bash
git add 'app/group/[link]/lib/community-types.ts' app/lib/api-v2.ts app/locales/ru.ts app/locales/en.ts 'app/group/[link]/lib/community-permissions.test.mjs'
git commit -m "refactor: align community client contracts"
```

### Task 6: Lift structure ownership and merge community editing into management

**Files:**
- Create: `app/group/[link]/hooks/use-community-structure.ts`
- Create: `app/group/[link]/components/community-settings-editor.tsx`
- Modify: `app/group/[link]/components/community-channel-shell.tsx`
- Modify: `app/group/[link]/components/community-manage-modal.tsx`
- Modify: `app/group/[link]/group-content.tsx`
- Modify: `app/group/[link]/components/community-management-ui.test.mjs`

**Interfaces:**
- `useCommunityStructure(communityId)` returns `{ structure, failed, refreshStructure }` and owns cache/WebSocket invalidation.
- `CommunityManageModal` accepts `initialTab`, community form values, `onCommunitySaved`, `structure`, and `onStructureChanged`.
- `CommunityChannelShell` accepts a loaded structure and no longer owns/renders management UI.

- [ ] **Step 1: Read the local Next.js client/router documentation required by AGENTS.md**

Read the Server/Client Components guide and current `useRouter` API guide before changing component boundaries.

- [ ] **Step 2: Write UI wiring assertions first**

Update `community-management-ui.test.mjs` to assert:

```js
assert.match(groupPageSource, /initialTab="community"/);
assert.match(groupPageSource, /<CommunityManageModal/);
assert.doesNotMatch(groupPageSource, /isEditModalOpen/);
assert.doesNotMatch(channelShellSource, /CommunityManageModal/);
assert.doesNotMatch(channelShellSource, /community_channel_manage/);
assert.match(managementSource, /activeTab === 'community'/);
```

- [ ] **Step 3: Run the test and verify current ownership fails**

Run: `node --experimental-strip-types 'app/group/[link]/components/community-management-ui.test.mjs'`.

- [ ] **Step 4: Extract structure loading to a hook**

Move cache key validation, initial cached value, refresh, community WebSocket listeners and delayed invalidation out of `CommunityChannelShell`. Preserve the no-flicker cached behavior and guest/user-specific cache key.

- [ ] **Step 5: Build the focused Community settings editor**

Create a controlled form for `slnk`, `name`, and `desk`; sanitize link input, prevent duplicate submit, call `AncialAPI.updateGroupInfo`, show field/general errors through existing UI/toast patterns, clear old profile cache, and return the new link through `onSaved(nextLink)`.

- [ ] **Step 6: Make the page own the modal**

Replace `isEditModalOpen` and the old form modal in `group-content.tsx` with common management state. The existing Edit button opens `CommunityManageModal` at `community`; render it for owner or effective `manage_community`. On link change call `router.push('/$' + nextLink)`, otherwise refresh the group and structure.

- [ ] **Step 7: Remove the channel Manage entry point**

Delete the management button/state/modal from the shell. Keep channel join-before-navigation, cached empty state and mobile list modal unchanged. All canonical channels route to `/messages/{hash}`.

- [ ] **Step 8: Run UI wiring, cache and TypeScript tests**

Run:

```bash
node --experimental-strip-types 'app/group/[link]/components/community-management-ui.test.mjs'
node --experimental-strip-types 'app/group/[link]/lib/community-cache.test.mjs'
npx tsc --noEmit
```

- [ ] **Step 9: Commit locally**

Stage only the files listed in this task and commit `feat: unify community management entry point`.

### Task 7: Single channel editor and tri-state overrides

**Files:**
- Modify: `app/group/[link]/components/community-channel-editor.tsx`
- Modify: `app/group/[link]/components/community-channel-list.tsx`
- Modify: `app/group/[link]/lib/community-presentation.ts`
- Modify: `app/group/[link]/lib/community-presentation.test.mjs`
- Create: `app/group/[link]/components/community-channel-editor.test.mjs`

**Interfaces:**
- Create/update payload contains `channel_type: 'text'`, `voice_enabled`, and independent `read_only`.
- Override state for each catalog permission is `'inherit' | 'allow' | 'deny'` and serializes to disjoint maps.

- [ ] **Step 1: Write source and pure serialization tests**

Assert the editor contains no type `<select>` or announcement/voice option, defaults `voiceEnabled` to true, supports an edit workspace, and maps tri-state values so inherit appears in neither map, allow only in allow, deny only in deny.

- [ ] **Step 2: Run the tests and verify they fail**

Run the new editor test and existing presentation test.

- [ ] **Step 3: Replace type selection with independent settings**

Creation fields: name, category, group-calls toggle default ON, read-only toggle default OFF. Add an edit action per existing channel that preloads name/category/voice/read-only/slow mode and sends `action: 'update'`.

- [ ] **Step 4: Replace override buttons with a tri-state control**

Render all eight `COMMUNITY_CHANNEL_PERMISSION_NAMES`. Each row exposes localized Inherit/Allow/Deny and guarantees disjoint payload maps. Reset/reload state when channel or role selection changes so old selections cannot leak.

- [ ] **Step 5: Simplify channel presentation**

Remove type labels/icons as behavioral signals; retain the shared channel icon and optionally show localized call/read-only status chips. Selecting any channel opens messages.

- [ ] **Step 6: Run component tests, TypeScript and lint on touched files**

Expected: all succeed.

- [ ] **Step 7: Commit locally**

Commit as `feat: make community calls a channel capability`.

### Task 8: Complete role editor for custom and system roles

**Files:**
- Modify: `app/group/[link]/components/community-role-editor.tsx`
- Modify: `app/group/[link]/components/community-manage-modal.tsx`
- Create: `app/group/[link]/components/community-role-editor.test.mjs`

**Interfaces:**
- Role workspace supports `mode: 'create' | 'edit'` and an optional selected role ID.
- System roles expose permission toggles only when the current actor is owner; custom roles expose editable name/color/permissions and deletion within server policy.

- [ ] **Step 1: Write UI source assertions**

Assert `manage_community` appears in the grouped permission catalog, `attach_files` does not, overview role rows have an edit action, system roles do not render delete, and edit requests use `action: 'update'` with `role_id`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --experimental-strip-types 'app/group/[link]/components/community-role-editor.test.mjs'`.

- [ ] **Step 3: Create grouped permission definitions**

Define management, content/moderation, and channel/call sections from the exact catalog in the spec. Each item uses localized title/description and the established Zypo toggle markup.

- [ ] **Step 4: Reuse one form for create and edit**

Selecting a role preloads fields. For system roles, lock name/color/position and submit only permissions; hide delete. For custom roles, submit editable fields and preserve delete confirmation. Disable permissions the actor lacks unless the role list identifies them as owner/full access.

- [ ] **Step 5: Verify system-role persistence in the UI refresh flow**

After save, call `refreshAll()` once and keep the selected role only if it still exists. Ensure `ensure_system_roles` no longer resets the saved permission JSON when roles reload.

- [ ] **Step 6: Run role UI test, TypeScript and lint**

Expected: all succeed.

- [ ] **Step 7: Commit locally**

Commit as `feat: complete community role management`.

### Task 9: Permission enforcement audit and final regression verification

**Files:**
- Modify only if a failing audit identifies a missing check in: `php-v2-api/backend.ru.zypo/api/V2/communities/*.php`, community post endpoints, message endpoints, or group-call WebSocket handlers.
- Create: `php-v2-api/tests/community-permission-wiring.test.php`
- Modify: `app/group/[link]/components/community-management-ui.test.mjs`

**Interfaces:**
- Every UI permission maps to at least one concrete server authorization check.
- No personal-call route or component changes are allowed.

- [ ] **Step 1: Write a permission-to-enforcement wiring test**

Create a map from each permission to expected backend files/tokens and assert each exists:

```php
$wiring = [
  'manage_community' => ['api/V2/groups/UpdateInfo.php'],
  'manage_channels' => ['api/V2/communities/Channels.php', 'api/V2/communities/Categories.php'],
  'manage_roles' => ['api/V2/communities/Roles.php', 'api/V2/communities/MemberRoles.php'],
  'manage_members' => ['api/V2/communities/Moderation.php'],
  'manage_messages' => ['api/V2/messages/DeleteMessage.php'],
  'manage_posts' => ['modules/communities/posts.php'],
  'manage_invites' => ['api/V2/messages/GroupAction.php'],
  'manage_join_requests' => ['api/V2/communities/LinkRequests.php'],
  'manage_voice' => ['api/V2/communities/Moderation.php'],
  'view_channel' => ['api/V2/communities/Structure.php'],
  'send_messages' => ['api/V2/messages/SendMessage.php'],
  'add_reactions' => ['api/V2/messages/Reaction.php'],
  'connect_voice' => ['ws-server.php'],
  'speak_voice' => ['ws-server.php'],
  'mention_everyone' => ['api/V2/messages/SendMessage.php'],
  'view_audit_log' => ['api/V2/communities/Audit.php'],
];
```

The wiring test resolves these paths relative to `php-v2-api/backend.ru.zypo/`; the WebSocket authorization lives in the existing `ws-server.php`.

- [ ] **Step 2: Run the audit and fix only genuine missing checks**

For each failure, inspect the endpoint data flow. Add `zypo_community_require_permission` or the existing effective-permission check at the mutation boundary. Do not add checks to unrelated personal chats/calls.

- [ ] **Step 3: Run all focused tests**

Run every `app/group/[link]/**/*.test.mjs`, every new `php-v2-api/tests/community-*.test.php`, and existing group-call state/layout tests.

- [ ] **Step 4: Run static verification**

Run:

```bash
npx tsc --noEmit
npx eslint 'app/group/[link]' app/lib/api-v2.ts app/locales/ru.ts app/locales/en.ts
find php-v2-api/backend.ru.zypo/api/V2/communities php-v2-api/backend.ru.zypo/modules/communities -name '*.php' -print0 | xargs -0 -n1 php -l
git diff --check
```

Expected: zero errors. If repository-wide pre-existing warnings appear, record them separately and ensure no changed file introduces one.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: successful local build. This command must not deploy or push.

- [ ] **Step 6: Review the final diff for scope and secrets**

Confirm no dump, credentials, generated build output, dependency lock changes, GitHub configuration or deployment files are staged. Confirm personal `/calls` and one-to-one call files are unchanged.

- [ ] **Step 7: Commit final local verification fixes**

Stage only intentional files and commit `test: verify community management permissions`. Do not push.
