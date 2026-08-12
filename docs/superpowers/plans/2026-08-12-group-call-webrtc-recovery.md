# Reliable Group Call Negotiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every group-call camera and screen-share track reach all peers reliably and recover broken inbound or outbound media without reloading.

**Architecture:** Keep one connection per participant and add per-peer perfect-negotiation state around stable audio/video transceivers. Extract collision, playable-video, and outbound-RTP decisions into pure helpers; the React hook owns browser objects, publication ordering, stats supervision, and targeted rebuilds.

**Tech Stack:** React 19, Next.js 16 client components, TypeScript, WebRTC, Node assertion tests, PHP Ratchet signaling.

## Global Constraints

- Work directly in the explicitly approved local `main` branch.
- Do not push or synchronize GitHub.
- Do not change one-to-one call code or layout.
- Do not change the existing group-call visual design or focused-video behavior.
- Keep the existing WebSocket `restart` relay protocol.

---

### Task 1: Pure Negotiation and Media-Health Rules

**Files:**
- Modify: `app/call/group/lib/group-call-state.ts`
- Modify: `app/call/group/lib/group-call-state.test.mjs`

**Interfaces:**
- Produces: `isPolitePeer(localUserId, remoteUserId): boolean`
- Produces: `resolveOfferCollision(state): { collision: boolean; ignore: boolean; rollback: boolean }`
- Produces: `hasPlayableVideoTrack(tracks): boolean`
- Produces: `hasOutboundVideoProgress(before, after): boolean`

- [ ] Add assertions covering polite/impolite collision behavior, stable answer handling, audio-only and muted-video streams, and increasing/non-increasing outbound bytes.
- [ ] Run `node app/call/group/lib/group-call-state.test.mjs` and confirm failure because the new exports do not exist.
- [ ] Implement only the pure decision helpers and types.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Pairwise Perfect Negotiation

**Files:**
- Modify: `app/call/group/[hash]/use-group-call.ts`

**Interfaces:**
- Consumes the Task 1 helpers.
- Maintains per-peer `{ makingOffer, ignoreOffer, isSettingRemoteAnswerPending }` state.
- Exposes no new component API.

- [ ] Add a focused regression assertion for the group-call engine contract that fails until per-peer negotiation state and collision handling exist.
- [ ] Run the focused test and verify the expected failure.
- [ ] Add per-peer negotiation state, serialized offer creation, polite rollback, ignored-offer ICE handling, and state cleanup.
- [ ] Generate offers only through the serialized pair queue and attach the active local video track before offer creation.
- [ ] Run focused tests and `npx tsc --noEmit`.

### Task 3: Transactional Video Publication and RTP Supervision

**Files:**
- Modify: `app/call/group/[hash]/use-group-call.ts`

**Interfaces:**
- Publication returns success only after every current sender accepted the track.
- Outbound watchdog compares video `bytesSent` snapshots and targets only stalled peers.

- [ ] Add regression assertions for publication failure propagation and outbound-progress decisions.
- [ ] Run focused tests and verify the new failure.
- [ ] Replace swallowed `replaceTrack()` failures with transactional publication and targeted peer recovery.
- [ ] Send participant media state only after successful publication.
- [ ] Start bounded outbound stats checks after camera/screen publication; recover peers whose live sender does not advance.
- [ ] Cancel stats timers on peer close, track replacement, leave, reset, and unmount.
- [ ] Run focused tests and TypeScript.

### Task 4: Never Render Audio-Only Streams as Video

**Files:**
- Modify: `app/call/group/components/group-call-tile.tsx`
- Modify: `app/call/group/group-call-layout.test.mjs`

**Interfaces:**
- Consumes `hasPlayableVideoTrack`.
- Shows the existing avatar fallback until a live, unmuted remote video track exists.

- [ ] Add a regression assertion that an advertised camera plus an audio-only/muted stream does not activate the video surface.
- [ ] Run the focused test and verify failure.
- [ ] Track video readiness from stream tracks and their mute/unmute/ended events.
- [ ] Gate video opacity, fallback opacity, and focus affordance on actual playable video.
- [ ] Re-run focused tests and TypeScript.

### Task 5: Full Verification

**Files:** Verify all changed files.

- [ ] Run `node app/call/group/lib/group-call-state.test.mjs` and `node app/call/group/group-call-layout.test.mjs`.
- [ ] Run `php php-v2-api/tests/group_voice_media_test.php` and `php -l php-v2-api/backend.ru.zypo/ws-server.php`.
- [ ] Run `npx tsc --noEmit`, targeted ESLint, React Doctor, and `npm run build`.
- [ ] Run `git diff --check`, inspect the diff, and commit locally on `main` only after all checks pass.
