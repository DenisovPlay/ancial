# Group Info Leave Button Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the Leave button across the full width below the three administrator group actions.

**Architecture:** Keep the existing action grid in `GroupInfoModal`. Use explicit static Tailwind grid classes and conditionally span only the administrator/owner Leave button across all columns, while preserving the regular-member two-column layout.

**Tech Stack:** React, TypeScript, Tailwind CSS, Next.js.

## Global Constraints

- Do not change button behavior, copy, state, colors, or permissions.
- Do not push or synchronize the repository with GitHub.
- Preserve the existing two-column regular-member layout.

---

### Task 1: Group action layout

**Files:**
- Modify: `app/messages/components/group-info-modal.tsx:511-560`
- Create: `app/messages/components/group-info-modal-layout.test.mjs`

**Interfaces:**
- Consumes: existing `isAdminOrOwner: boolean` render-time permission flag.
- Produces: explicit `grid-cols-3`/`grid-cols-2` action grid classes and an administrator-only `col-span-full` Leave button class.

- [x] **Step 1: Write the failing source regression test**

```js
assert.match(source, /isAdminOrOwner \? 'grid-cols-3' : 'grid-cols-2'/);
assert.match(source, /isAdminOrOwner \? 'col-span-full' : ''/);
```

- [x] **Step 2: Run the regression test and verify it fails**

Run: `node app/messages/components/group-info-modal-layout.test.mjs`
Expected: FAIL because the component still uses a dynamically interpolated grid class and the Leave button does not span the grid.

- [x] **Step 3: Apply the minimal layout change**

```tsx
<div className={`grid ${isAdminOrOwner ? 'grid-cols-3' : 'grid-cols-2'} gap-3 w-full`}>
  {/* existing action buttons */}
  <button className={`${isAdminOrOwner ? 'col-span-full' : ''} ...`}>
    {/* existing Leave content */}
  </button>
</div>
```

- [x] **Step 4: Verify the implementation**

Run:

```bash
node app/messages/components/group-info-modal-layout.test.mjs
npx eslint app/messages/components/group-info-modal.tsx
npx tsc --noEmit
npx react-doctor@latest --verbose --scope changed
```

Expected: regression test passes, TypeScript passes, and no new component-level diagnostics are introduced.

- [x] **Step 5: Commit locally**

```bash
git add app/messages/components/group-info-modal.tsx app/messages/components/group-info-modal-layout.test.mjs docs/superpowers/plans/2026-08-12-group-info-leave-button-layout.md
git commit -m "fix: stretch group leave action"
```
