# Compact Community Channels and Management UI Design

## Goal

Reduce duplication on community pages and make administration practical on desktop without making the mobile modal denser.

## Community Page

- Each existing compact channel row is the complete interaction target.
- Clicking a row runs the existing join/request flow and then opens messages or the group call.
- Remove the separate selected-channel card, channel-type subtitle, and large open button.
- Keep category headings, member counts, loading state, access control, and the management button.

## Management Modal

- Use a wide desktop panel up to 1180px and retain the current bottom-sheet layout on phones.
- Desktop uses a persistent left navigation rail and a right workspace.
- Mobile keeps the horizontal drag-scroll tabs.
- Channel and role overview screens show compact lists and action buttons.
- Creation, category management, channel permissions, and role creation open as in-modal workspaces with a localized back button.
- API calls, permissions, confirmation dialogs, and refresh behavior remain unchanged.

## Scope and Verification

- Change only community channel presentation and management composition.
- Keep Zypo spacing, `rounded-3xl`, `duration-300`, and `active:scale-95` interaction tokens.
- Add RU/EN labels for the new workspace actions.
- Run focused community tests, TypeScript, ESLint, React Doctor, and the production build.
- Work locally in `main`; do not push GitHub.
