# Group Call WebRTC Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically restore missing group-call audio/video and clarify media-control states without page reloads.

**Architecture:** Pure recovery helpers define offer ownership and retry eligibility. `useGroupCall` serializes signals per peer, supervises connection/video health, and uses an addressed WebSocket `restart` request; `ws-server.php` validates and relays it. The group call client renders state-specific controls and opens camera selection only for multiple devices.

**Tech Stack:** React 19, Next.js 16, TypeScript, WebRTC, Ratchet WebSocket PHP, Tailwind CSS 4, Node/PHP assertion tests.

## Global Constraints

- Group calls only; one-to-one calls remain unchanged.
- Recovery is rate-limited and capped per peer.
- New labels use `app/locales/ru.ts` and `app/locales/en.ts`.
- No GitHub push or synchronization.

---

### Task 1: Recovery Rules and Relay

**Files:**
- Modify: `app/call/group/lib/group-call-state.ts`
- Modify: `app/call/group/lib/group-call-state.test.mjs`
- Modify: `php-v2-api/backend.ru.zypo/ws-server.php`
- Modify: `php-v2-api/tests/group_voice_media_test.php`

- [ ] Add failing assertions for deterministic offer ownership, recovery states, attempt caps, and the `restart` relay kind.
- [ ] Run the Node and PHP tests and verify they fail for the missing behavior.
- [ ] Implement the pure helpers and server validation/relay for `restart`.
- [ ] Re-run both tests and PHP syntax validation.

### Task 2: WebRTC Supervision

**Files:**
- Modify: `app/call/group/[hash]/use-group-call.ts`
- Modify: `app/call/group/group-call-layout.test.mjs`

- [ ] Add failing source assertions for per-peer signal queues, disconnect/video timers, recovery throttling, and `restart` handling.
- [ ] Run the layout test and verify the new assertions fail.
- [ ] Serialize offer/answer/ICE handling per peer.
- [ ] Add deterministic recovery for failed, prolonged disconnected, and missing advertised video.
- [ ] Clear all supervision state on successful media, peer close, reset, leave, and unmount.
- [ ] Re-run focused tests and TypeScript.

### Task 3: Media Controls

**Files:**
- Modify: `app/call/group/[hash]/group-call-client.tsx`
- Modify: `app/call/group/group-call-layout.test.mjs`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`

- [ ] Add failing assertions for distinct on/off icons and the `cameras.length > 1` dropdown condition.
- [ ] Implement crossed microphone/camera/speaker icons and start/stop screen-share icons.
- [ ] Use neutral, red, and purple control tones consistently with localized labels.
- [ ] Toggle a single camera directly and open the dropdown only for multiple cameras.
- [ ] Re-run focused tests, lint, and React Doctor.

### Task 4: Full Verification

**Files:** Verify all changed files.

- [ ] Run Node group-call tests and the PHP voice test.
- [ ] Run `php -l`, ESLint, `npx tsc --noEmit`, React Doctor, and `npm run build`.
- [ ] Inspect diff/status and create only a local commit on the existing feature branch.

