# Community Channel Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render previously loaded community channels, including a valid empty list, immediately while refreshing them in the background.

**Architecture:** Add pure viewer-aware cache helpers beside the existing community types. Split the shell into a viewer-keyed wrapper and stateful inner component so lazy cached state is recreated safely when the viewer/community changes.

**Tech Stack:** React 19, TypeScript, existing `cache.ts`, Next.js 16, Node tests.

## Global Constraints

- Cache permissions separately per viewer.
- Use `groups/profile`; do not access `localStorage` directly.
- Keep cached content visible when a background refresh fails.
- Do not synchronize with GitHub.

---

### Task 1: Cache helpers and regression test

**Files:**
- Create: `app/group/[link]/lib/community-cache.test.mjs`
- Modify: `app/group/[link]/lib/community-types.ts`

- [ ] Write tests proving different viewers get different keys, empty channels are valid, and mismatched community IDs are rejected.
- [ ] Run the test and verify it fails before implementation.
- [ ] Implement `communityStructureCacheKey()` and `validateCachedCommunityStructure()`.
- [ ] Run the test and verify it passes.

### Task 2: Stale-while-revalidate shell

**Files:**
- Modify: `app/group/[link]/components/community-channel-shell.tsx`

- [ ] Read the cache through a lazy state initializer.
- [ ] Render cached empty data without a skeleton.
- [ ] Refresh in the background and write successful responses to cache.
- [ ] Preserve cached content when refresh fails.
- [ ] Keep realtime and management refreshes on the same cache-writing loader.

### Task 3: Verification

- [ ] Run the cache test and existing community permission test.
- [ ] Run focused ESLint and TypeScript.
- [ ] Run React Doctor on changed files and a production build.
- [ ] Commit locally without pushing.
