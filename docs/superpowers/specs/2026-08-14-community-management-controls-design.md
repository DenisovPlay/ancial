# Community Management Controls Design

## Goal

Make channel, category, permission, and role controls in the community management modal consistent and usable on narrow mobile screens.

## Channel overview

- Keep the three primary actions in a three-column grid at every viewport width.
- Use equal-height compact buttons that retain their localized labels.
- Keep each channel title visible on mobile by reserving the flexible row area for the title and making metadata and actions non-shrinking.
- Replace the channel edit and delete text buttons with compact icon buttons using `IC-edit` and `IC-trash`.
- Give icon buttons localized accessible names and tooltips.

## Role overview and form

- Style the create-role action with the same primary purple button treatment used by the channel, category, and channel-permission actions.
- Replace the browser's visually inconsistent native color field with a Zypo-styled color control.
- The styled control displays a color swatch and current hexadecimal value while an overlaid native color input retains the system color picker and keyboard interaction.
- Keep role saving, permission checks, and API requests unchanged.

## Category form

- Add a localized category-name placeholder in Russian and English.
- Replace the wide text submit button with a compact `IC-plus` icon button.
- Disable the add button while the trimmed category name is empty.
- Preserve the existing create-category request and list refresh behavior.

## Design and accessibility

- Follow the existing Zypo tokens: `rounded-3xl`, `gap-3`, `p-3`, `cursor-pointer`, `active:scale-95`, and `duration-300`.
- All icon-only controls receive localized `aria-label` and `title` values.
- No API, data model, permission, or desktop modal-layout behavior changes are included.

## Verification

- Add focused source-wiring assertions for the responsive grid, icon actions, category placeholder, category add state, and styled color control.
- Run the focused regression test, ESLint on changed source files, TypeScript validation, and React Doctor on the changed React files.
