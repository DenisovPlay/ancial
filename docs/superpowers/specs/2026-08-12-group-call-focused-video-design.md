# Group Call Focused Video Design

## Goal

Allow a participant who is publishing camera video or a screen share to be expanded inside the available group-call area, while ensuring shared screens are shown completely without cropping.

## Scope

- Change only the group-call route under `app/call/group/`.
- Keep the existing one-to-one call route and design unchanged.
- Keep the call header and bottom controls visible while a participant is focused.
- Do not request browser fullscreen.

## Interaction

- A tile is focusable only while that participant advertises an active camera or screen share.
- Clicking a focusable tile replaces the grid with that tile in the call content area.
- Clicking the focused tile or its explicit close control returns to the participant grid.
- If the focused participant stops publishing video or leaves, focus is cleared automatically.
- Tiles without active video remain non-interactive.

## Video Rendering

- Screen shares use `object-contain` in both the grid and focused state so the complete shared screen remains visible.
- Camera video uses `object-cover` to fill its tile.
- The existing avatar fallback remains visible until a usable video stream is attached.

## Component Boundaries

- `group-call-state.ts` contains pure focus eligibility and focus-reset helpers so the behavior is testable without a browser.
- `group-call-client.tsx` owns the focused participant id and chooses between grid and focused rendering.
- `group-call-tile.tsx` owns tile interaction, focus accessibility labels, close affordance, and camera-versus-screen object fit.

## Accessibility and Localization

- Focusable tiles use a real button interaction surface or equivalent keyboard-operable semantics.
- The focus action and return action have localized Russian and English labels.
- Focus indication is visible and does not rely only on color.

## Verification

- Pure state tests cover focus eligibility and automatic focus clearing.
- Source/layout regression tests cover `object-contain`, focus state, and localized controls.
- Type checking, focused tests, lint for changed files, and React diagnostics must pass.

