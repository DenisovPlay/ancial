# Group Video Calls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the audio-only group voice-room UI with a dedicated full-screen group call supporting cameras and screen sharing for up to eight participants while leaving one-to-one calls unchanged.

**Architecture:** Extend the existing authenticated `voice:signal` WebRTC mesh with camera/screen state, then build an isolated `/call/group/[hash]` client around that protocol. Route both community voice channels and ordinary group-chat voice actions to the new page; keep `/call/[hash]/call-client.tsx` untouched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, browser WebRTC APIs, Ratchet/PHP WebSocket server, MySQL.

## Global Constraints

- Do not modify the visual behavior or signaling of `/call/[hash]` one-to-one calls.
- Group calls remain limited to exactly 8 participants.
- Microphone starts enabled when `speak_voice` is granted; camera starts disabled.
- The local participant is a normal grid tile; no floating local preview is rendered.
- All new copy uses `useAuth().lang` with keys in both `app/locales/ru.ts` and `app/locales/en.ts`.
- Do not push, create a pull request, or otherwise synchronize with GitHub.
- No SQL migration is required: `msg_voice_participants.camera_enabled` and `screen_enabled` already exist in `php-v2-api/SQL_COMMANDS_COMMUNITY_PLATFORM.txt`.

---

### Task 1: Authoritative voice media state

**Files:**
- Create: `php-v2-api/backend.ru.zypo/modules/messages/voice_media.php`
- Create: `php-v2-api/tests/group_voice_media_test.php`
- Modify: `php-v2-api/backend.ru.zypo/ws-server.php:1-1100`

**Interfaces:**
- Produces: `zypo_voice_media_state(array $payload, bool $canPublish): array{mic_enabled: bool, cam_enabled: bool, screen_enabled: bool}`.
- Produces over `voice:signal`: participant fields `mic_enabled`, `cam_enabled`, and `screen_enabled` in join, snapshot, status, participant-joined, and media events.
- Persists the three flags into existing `msg_voice_participants` columns.

- [ ] **Step 1: Write failing normalization tests**

```php
$state = zypo_voice_media_state([
    'mic_enabled' => true,
    'cam_enabled' => true,
    'screen_enabled' => false,
], true);
assert($state === ['mic_enabled' => true, 'cam_enabled' => true, 'screen_enabled' => false]);

$listenOnly = zypo_voice_media_state([
    'mic_enabled' => true,
    'cam_enabled' => true,
    'screen_enabled' => true,
], false);
assert($listenOnly === ['mic_enabled' => false, 'cam_enabled' => false, 'screen_enabled' => false]);

$screen = zypo_voice_media_state(['cam_enabled' => true, 'screen_enabled' => true], true);
assert($screen['cam_enabled'] === false && $screen['screen_enabled'] === true);
```

- [ ] **Step 2: Run the PHP test and verify RED**

Run: `php php-v2-api/tests/group_voice_media_test.php`
Expected: FAIL because `voice_media.php` and `zypo_voice_media_state()` do not exist.

- [ ] **Step 3: Implement normalization and server signaling**

```php
function zypo_voice_media_state(array $payload, bool $canPublish): array
{
    if (!$canPublish) {
        return ['mic_enabled' => false, 'cam_enabled' => false, 'screen_enabled' => false];
    }
    $screen = zypo_voice_media_bool($payload['screen_enabled'] ?? false);
    return [
        'mic_enabled' => zypo_voice_media_bool($payload['mic_enabled'] ?? false),
        'cam_enabled' => !$screen && zypo_voice_media_bool($payload['cam_enabled'] ?? false),
        'screen_enabled' => $screen,
    ];
}
```

Require the helper from `ws-server.php`. Store `mic`, `cam`, and `screen` per room participant; reject any enabled publication state when `speak_voice` is false; include all three booleans in snapshots and broadcasts. Change persistence to update `microphone_enabled`, `camera_enabled`, and `screen_enabled` together.

- [ ] **Step 4: Verify backend behavior**

Run:

```bash
php php-v2-api/tests/group_voice_media_test.php
php -l php-v2-api/backend.ru.zypo/modules/messages/voice_media.php
php -l php-v2-api/backend.ru.zypo/ws-server.php
```

Expected: test prints `group voice media: ok`; both PHP files report no syntax errors.

- [ ] **Step 5: Commit locally**

```bash
git add php-v2-api/backend.ru.zypo/modules/messages/voice_media.php php-v2-api/tests/group_voice_media_test.php php-v2-api/backend.ru.zypo/ws-server.php
git commit -m "feat: add group video signaling state"
```

---

### Task 2: Testable group-call client state

**Files:**
- Create: `app/call/group/lib/group-call-state.ts`
- Create: `app/call/group/lib/group-call-state.test.mjs`

**Interfaces:**
- Produces: `GroupCallParticipant`, `VoiceSignal`, and `ParticipantMediaState` types.
- Produces: `normalizeParticipant(raw): GroupCallParticipant | null`.
- Produces: `getGroupCallGridClass(count: number): string`.
- Produces: `updateParticipantMedia(participants, userId, media): GroupCallParticipant[]`.

- [ ] **Step 1: Write failing client-state tests**

```js
assert.equal(getGroupCallGridClass(1), 'grid-cols-1');
assert.equal(getGroupCallGridClass(4), 'grid-cols-1 sm:grid-cols-2');
assert.equal(getGroupCallGridClass(8), 'grid-cols-2 lg:grid-cols-4');
assert.deepEqual(normalizeParticipant({ user_id: '7', mic_enabled: 1 }), {
  user_id: 7,
  mic_enabled: true,
  cam_enabled: false,
  screen_enabled: false,
});
```

- [ ] **Step 2: Run the client-state test and verify RED**

Run: `node app/call/group/lib/group-call-state.test.mjs`
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement immutable state helpers**

Use explicit static Tailwind class strings so the production scanner includes every layout. Clamp the layout count to 1-8 and ignore invalid participant IDs.

- [ ] **Step 4: Run the client-state test and verify GREEN**

Run: `node app/call/group/lib/group-call-state.test.mjs`
Expected: `group call state: ok`.

- [ ] **Step 5: Commit locally**

```bash
git add app/call/group/lib/group-call-state.ts app/call/group/lib/group-call-state.test.mjs
git commit -m "feat: add group call state helpers"
```

---

### Task 3: Group WebRTC media engine

**Files:**
- Create: `app/call/group/[hash]/use-group-call.ts`

**Interfaces:**
- Consumes: `dialogId`, `canPublish`, `currentUserId`, `title`, and normalized dialog members.
- Produces: `{ participants, streams, localStream, joined, joining, micEnabled, camEnabled, screenEnabled, deafened, cameras, selectedCameraId, join, leave, toggleMic, toggleCamera, switchCamera, toggleScreenShare, toggleDeafen }`.
- Sends and receives the Task 1 `voice:signal` contract through `globalWS`.

- [ ] **Step 1: Implement room lifecycle with existing protocol**

Subscribe to the dialog, fetch TURN configuration in parallel with microphone acquisition, send `join`, process snapshot/status/join/leave/media/offer/answer/ICE events, and rebuild peers after WebSocket resubscription.

- [ ] **Step 2: Implement stable audio/video peer senders**

For each peer:

```ts
const audioSender = localAudioTrack
  ? peer.addTrack(localAudioTrack, localStream)
  : peer.addTransceiver('audio', { direction: 'recvonly' }).sender;
const videoSender = peer.addTransceiver('video', { direction: 'sendrecv' }).sender;
await videoSender.replaceTrack(activeVideoTrackRef.current);
```

Only the joining participant offers to snapshot participants, preserving the current glare-free room behavior.

- [ ] **Step 3: Implement camera and screen track replacement**

Camera acquisition uses the selected `deviceId`. Screen sharing uses `getDisplayMedia({ video: true, audio: false })`; `track.onended` restores the camera when it was enabled. Every peer's stable video sender receives the same current camera/screen track via `replaceTrack`.

- [ ] **Step 4: Implement cleanup and failures**

On leave/unmount/moderation disconnect: send leave when possible, stop audio/camera/screen tracks, close all peers, clear pending ICE, remove listeners, unsubscribe the dialog, and clear Rich Presence. Camera/screen permission failures must not disconnect audio.

- [ ] **Step 5: Type-check the hook**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit locally**

```bash
git add app/call/group/[hash]/use-group-call.ts
git commit -m "feat: add group WebRTC call engine"
```

---

### Task 4: Full-screen adaptive group call page

**Files:**
- Create: `app/call/group/[hash]/page.tsx`
- Create: `app/call/group/[hash]/group-call-client.tsx`
- Create: `app/call/group/components/group-call-tile.tsx`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`

**Interfaces:**
- Loads `AncialAPI.getDialogByHash<GroupCallDialogResponse>(hash)`.
- Uses `dialog.community_permissions.connect_voice` and `speak_voice`; ordinary group dialogs default to publish access and remain server-authorized.
- Renders Task 3 streams using Task 2 grid classes.

- [ ] **Step 1: Add the route and authenticated loader**

Validate that the target is a voice-enabled group dialog. Show the existing loading style, localized errors, and a media-access modal before joining.

- [ ] **Step 2: Build the adaptive participant tile**

`GroupCallTile` attaches `stream` through `video.srcObject`, keeps the local video muted, covers inactive video with the member avatar, and shows name plus mic/camera/screen state. The video element stays mounted so remote audio continues when the visual cover is visible.

- [ ] **Step 3: Build the call composition**

Render the unchanged Zypo call surface conventions: black fullscreen background, gradient header, adaptive central grid, and rounded blurred bottom control bar. Do not render a floating local preview.

- [ ] **Step 4: Add controls and localization**

Add semantic buttons for mic, camera/device dropdown, screen sharing, deafen, and leave. Add only missing translation keys in both locale files and consume them through `lang`.

- [ ] **Step 5: Verify the page**

Run:

```bash
node app/call/group/lib/group-call-state.test.mjs
npx eslint app/call/group app/locales/ru.ts app/locales/en.ts
npx tsc --noEmit
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit locally**

```bash
git add app/call/group app/locales/ru.ts app/locales/en.ts
git commit -m "feat: add full-screen group video calls"
```

---

### Task 5: Route every group voice entry to the new call page

**Files:**
- Modify: `app/group/[link]/components/community-channel-shell.tsx`
- Modify: `app/messages/messages-content.tsx`
- Delete: `app/messages/components/group-voice-room-modal.tsx`

**Interfaces:**
- Community voice channel: `router.push('/call/group/' + encodeURIComponent(channel.hash))`.
- Group dialog call button: `router.push('/call/group/' + encodeURIComponent(dialog.hash))`.
- Message-page participant badge consumes `voice:signal` status events directly.

- [ ] **Step 1: Replace community modal navigation**

Remove the dynamic modal import, modal state, modal-only subscription, and render block. Keep the selected-channel behavior, but route voice channels to the group-call URL.

- [ ] **Step 2: Replace group-message modal navigation**

Remove `groupVoiceModalOpen` and the modal render. Route the group call button using the selected dialog hash. Register a lightweight `voice:signal` handler while the dialog is subscribed so the existing participant-count badge still updates.

- [ ] **Step 3: Remove the obsolete audio-only modal**

Delete `group-voice-room-modal.tsx` after `rg "GroupVoiceRoomModal" app` returns only the file itself.

- [ ] **Step 4: Verify integrations**

Run:

```bash
rg -n "GroupVoiceRoomModal|groupVoiceModalOpen" app
npx tsc --noEmit
```

Expected: `rg` finds nothing and TypeScript exits 0.

- [ ] **Step 5: Commit locally**

```bash
git add app/group/[link]/components/community-channel-shell.tsx app/messages/messages-content.tsx app/messages/components/group-voice-room-modal.tsx
git commit -m "feat: open group voice channels as calls"
```

---

### Task 6: End-to-end verification

**Files:**
- Modify only files required by diagnostics found on newly changed lines.

- [ ] **Step 1: Run backend and pure client tests**

```bash
php php-v2-api/tests/group_voice_media_test.php
php php-v2-api/tests/community_permissions_test.php
node app/call/group/lib/group-call-state.test.mjs
node app/group/[link]/lib/community-permissions.test.mjs
```

- [ ] **Step 2: Run syntax, type, lint, and React diagnostics**

```bash
php -l php-v2-api/backend.ru.zypo/ws-server.php
npx tsc --noEmit
npx eslint app/call/group app/group/[link]/components/community-channel-shell.tsx
npx react-doctor@latest --verbose --scope changed
```

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: optimized build completes and all routes generate successfully.

- [ ] **Step 4: Record manual acceptance boundary**

Document that true multi-user camera/screen/TURN verification requires 2-3 authenticated browser sessions against the deployed PHP WebSocket server. Do not claim those scenarios were manually verified when the required server sessions are unavailable locally.
