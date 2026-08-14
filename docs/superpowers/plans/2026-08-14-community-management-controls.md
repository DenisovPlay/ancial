# Community Management Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make community channel, category, and role controls consistent and usable on mobile without changing their API behavior.

**Architecture:** Keep the current editor components and state flows. Change only their responsive Tailwind composition, replace text-only CRUD actions with existing SVG symbols, wrap the native color input in a styled accessible control, and add the two required localization entries.

**Tech Stack:** React 19, Next.js 16 App Router, Tailwind CSS 4, Node.js assertions.

## Global Constraints

- Preserve all existing community API requests and permission logic.
- Keep the three channel actions in `grid-cols-3` on mobile and desktop.
- Use localization keys from `app/locales/ru.ts` and `app/locales/en.ts` for all new text.
- Follow the existing Zypo interaction tokens: `rounded-3xl`, `gap-3`, `p-3`, `cursor-pointer`, `active:scale-95`, and `duration-300`.
- Do not push or synchronize the Git repository.

---

### Task 1: Add the regression contract

**Files:**
- Create: `app/group/[link]/components/community-management-controls.test.mjs`
- Read: `app/group/[link]/components/community-channel-editor.tsx`
- Read: `app/group/[link]/components/community-role-editor.tsx`
- Read: `app/locales/ru.ts`
- Read: `app/locales/en.ts`

**Interfaces:**
- Consumes: source text of the two editors and locale dictionaries.
- Produces: executable assertions covering the requested UI contract.

- [x] **Step 1: Write the failing source-wiring test**

Assert that channel actions use `grid-cols-3`, channel edit/delete controls use `IC-edit` and `IC-trash`, the category input uses `community_category_name`, category creation uses `IC-plus` and a disabled empty-name guard, the role create action uses compact responsive text, the role edit/delete controls use `IC-edit` and `IC-trash`, and the role form contains a styled color swatch plus `community_role_color` in both locale files.

- [x] **Step 2: Run the test and verify RED**

Run: `node 'app/group/[link]/components/community-management-controls.test.mjs'`

Expected: assertion failure because the existing controls do not satisfy the new contract.

### Task 2: Implement the responsive controls

**Files:**
- Modify: `app/group/[link]/components/community-channel-editor.tsx`
- Modify: `app/group/[link]/components/community-role-editor.tsx`
- Modify: `app/locales/ru.ts`
- Modify: `app/locales/en.ts`
- Test: `app/group/[link]/components/community-management-controls.test.mjs`

**Interfaces:**
- Consumes: existing `lang`, `primary`, `categoryName`, `color`, `openEdit`, and delete-state callbacks.
- Produces: responsive channel actions, accessible icon controls, a localized category input, and a styled native color picker.

- [x] **Step 1: Implement channel and category controls**

Use `grid grid-cols-3 gap-2 sm:gap-3` for the action toolbar. Give channel rows a `min-w-0 flex-1` title/metadata column and fixed-size edit/delete icon buttons. Add `placeholder={lang?.community_category_name}`, and replace category submit text with `IC-plus`, `aria-label`, `title`, and `disabled={!categoryName.trim()}`.

- [x] **Step 2: Implement role controls**

Apply the same `primary` class and `text-xs sm:text-sm` label sizing to the create-role action. Replace the role edit/delete text buttons with fixed-size `IC-edit` and `IC-trash` buttons carrying localized `aria-label` and `title`. Replace the visible native color box with a `focus-within` styled label containing `lang?.community_role_color`, the uppercase hexadecimal value, a circular swatch using `style={{ backgroundColor: color }}`, and an absolute transparent native `input type="color"`.

- [x] **Step 3: Add localization**

Reuse the existing Russian and English `community_category_name` values, and add Russian `community_role_color: "Цвет роли"` plus English `community_role_color: "Role color"`.

- [x] **Step 4: Verify GREEN and static checks**

Run:

```bash
node 'app/group/[link]/components/community-management-controls.test.mjs'
npx eslint 'app/group/[link]/components/community-channel-editor.tsx' 'app/group/[link]/components/community-role-editor.tsx' 'app/group/[link]/components/community-management-controls.test.mjs'
npx tsc --noEmit
npx react-doctor@latest --verbose --scope changed
```

Expected: regression test, ESLint, and TypeScript exit successfully; React Doctor introduces no diagnostics on changed lines.

- [x] **Step 5: Commit locally**

Commit the implementation, test, locales, and this plan on `main`. Do not push.
