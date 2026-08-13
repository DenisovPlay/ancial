# Group Call Pulse Pause Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pause Pulse before navigating from a messages dialog to its group-call route.

**Architecture:** Keep the existing messages-page navigation flow and mirror the one-to-one handler's guarded `togglePlay()` call. Protect the behavior with a focused source-wiring regression test.

**Tech Stack:** React 19, Next.js 16 App Router, Node.js assertions.

## Global Constraints

- Preserve the current track, queue, and playback position.
- Do not resume playback automatically.
- Do not push or synchronize the Git repository.

---

### Task 1: Pause Pulse before group-call navigation

**Files:**
- Create: `app/messages/group-call-navigation.test.mjs`
- Modify: `app/messages/messages-content.tsx`

**Interfaces:**
- Consumes: existing `isPlaying`, `togglePlay`, and `router.push` values in `MessagesContent`.
- Produces: group-call click behavior that pauses an active Pulse track before navigation.

- [x] **Step 1: Write the failing test**

Read `messages-content.tsx`, isolate the `group-voice-button` block, and assert that `if (isPlaying) togglePlay();` occurs before `router.push('/call/group/...')`.

- [x] **Step 2: Run test to verify it fails**

Run: `node app/messages/group-call-navigation.test.mjs`

Expected: assertion failure because the group handler does not pause Pulse.

- [x] **Step 3: Write minimal implementation**

Add `if (isPlaying) togglePlay();` immediately before the existing group-call `router.push()`.

- [x] **Step 4: Run focused and static verification**

Run:

```bash
node app/messages/group-call-navigation.test.mjs
npx eslint app/messages/messages-content.tsx app/messages/group-call-navigation.test.mjs
npx tsc --noEmit
```

Expected: all commands exit successfully.

- [x] **Step 5: Commit locally**

Commit only the test, implementation, and this plan. Do not push.
