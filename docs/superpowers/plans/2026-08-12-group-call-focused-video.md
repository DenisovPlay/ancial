# Group Call Focused Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand an active group-call camera or screen share inside the call area and render shared screens without cropping.

**Architecture:** Pure helpers in `group-call-state.ts` decide whether a participant can be focused and whether focus remains valid. `GroupCallRoom` owns focus state, while `GroupCallTile` renders camera/screen media with the correct object fit and exposes localized, keyboard-operable focus controls.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Node assertion tests.

## Global Constraints

- Do not change the one-to-one call route.
- Do not use browser fullscreen; header and call controls remain visible.
- Screen shares use `object-contain`; cameras use `object-cover`.
- All new user-facing text must be added to `app/locales/ru.ts` and `app/locales/en.ts`.
- Do not push or synchronize the GitHub repository.

---

### Task 1: Focus State Rules

**Files:**
- Modify: `app/call/group/lib/group-call-state.ts`
- Test: `app/call/group/lib/group-call-state.test.mjs`

**Interfaces:**
- Produces: `canFocusParticipant(participant: GroupCallParticipant): boolean`
- Produces: `resolveFocusedParticipantId(focusedUserId: number | null, participants: GroupCallParticipant[]): number | null`

- [ ] **Step 1: Write failing assertions** for camera/screen eligibility, audio-only rejection, retained valid focus, stopped-video clearing, and departed-user clearing.
- [ ] **Step 2: Run `node --experimental-strip-types app/call/group/lib/group-call-state.test.mjs`** and verify imports or assertions fail because the helpers do not exist.
- [ ] **Step 3: Implement the two pure helpers** using participant media state and exact user-id matching.
- [ ] **Step 4: Re-run the focused state test** and verify it passes.

### Task 2: Focused Tile UI

**Files:**
- Modify: `app/call/group/[hash]/group-call-client.tsx`
- Modify: `app/call/group/components/group-call-tile.tsx`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`
- Test: `app/call/group/group-call-layout.test.mjs`

**Interfaces:**
- Consumes: `canFocusParticipant` and `resolveFocusedParticipantId` from Task 1.
- Extends `GroupCallTile` with `focused?: boolean` and `onFocusChange?: (focused: boolean) => void`.

- [ ] **Step 1: Add failing source assertions** that require focus state in `GroupCallRoom`, focused rendering, localized labels, and `object-contain` for screen sharing.
- [ ] **Step 2: Run `node app/call/group/group-call-layout.test.mjs`** and verify the new assertions fail for the missing behavior.
- [ ] **Step 3: Add localization keys** `voice_focus_video` and `voice_return_to_grid` in both locale files.
- [ ] **Step 4: Implement focus ownership in `GroupCallRoom`** with automatic clearing when the selected participant disappears or stops video.
- [ ] **Step 5: Implement tile interaction** so only active video is keyboard/click focusable, a focused tile has a close control, screen shares use `object-contain`, and cameras use `object-cover`.
- [ ] **Step 6: Re-run both group-call tests** and verify they pass.

### Task 3: Regression Verification

**Files:**
- Verify all changed files above.

- [ ] **Step 1: Run `npx tsc --noEmit`** and resolve any changed-code type errors.
- [ ] **Step 2: Run ESLint on the changed TypeScript/TSX files** and resolve any new diagnostics.
- [ ] **Step 3: Run both group-call Node tests together** and confirm clean output.
- [ ] **Step 4: Run React Doctor** and inspect findings affecting the changed components.
- [ ] **Step 5: Inspect the final diff and git status** to ensure only scoped local changes exist and nothing was pushed.

