# Community Member Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crowded community member controls with a compact actions dropdown and give management tabs Feed-style hidden drag scrolling.

**Architecture:** Reuse the global `Dropdown`/`DropdownItem` primitives and the existing `useDragScroll` hook. Keep API calls and confirmation behavior inside `CommunityModeration`; only presentation and interaction grouping change.

**Tech Stack:** React, Next.js App Router, TypeScript, Tailwind CSS.

## Global Constraints

- Use `useAuth()` for every new label; add translation keys to both locale files when necessary.
- Follow Zypo tokens: `rounded-3xl`, `p-3`, `gap-3`, `cursor-pointer`, `active:scale-95`, `duration-300`.
- Do not push or synchronize with GitHub.

---

### Task 1: Compact member actions

**Files:**
- Modify: `app/group/[link]/components/community-moderation.tsx`
- Test: `app/group/[link]/components/community-management-ui.test.mjs`

**Interfaces:**
- Consumes: `Dropdown`, `DropdownItem`, existing moderation and role mutation callbacks.
- Produces: compact member rows with a single actions trigger for non-owner members.

- [ ] Write a source regression test requiring the shared dropdown and forbidding the old always-visible moderation button layout.
- [ ] Run the test and confirm it fails on the current component.
- [ ] Add the dropdown, role assignment controls, role removal items, mute, kick, and ban commands.
- [ ] Run the focused test and TypeScript checks.

### Task 2: Feed-style management tab scrolling

**Files:**
- Modify: `app/group/[link]/components/community-manage-modal.tsx`
- Test: `app/group/[link]/components/community-management-ui.test.mjs`

**Interfaces:**
- Consumes: `useDragScroll({ speed: 2 })` and global `drag-scroll viewport` styles.
- Produces: a scrollbar-free draggable horizontal tab strip with native touch scrolling.

- [ ] Extend the regression test to require the Feed drag-scroll hook and class contract.
- [ ] Run the test and confirm the new assertion fails.
- [ ] Attach the hook ref and Feed classes to the tab strip.
- [ ] Run focused verification, React Doctor, and the production build.
- [ ] Commit locally without pushing.
