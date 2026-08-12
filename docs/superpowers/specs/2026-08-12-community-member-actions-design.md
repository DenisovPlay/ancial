# Community member actions design

## Goal

Make the community member list compact and readable at every modal width, while keeping role assignment and moderation actions quickly accessible. Make management tabs behave like Feed topics on Windows and touch devices.

## Member row

Each member uses one horizontal card. The name and current role summary occupy the flexible content area. Non-owner rows expose one compact `IC-more` trigger aligned to the right. The owner has no action trigger.

The existing shared `Dropdown` and `DropdownItem` components provide the menu, outside-click closing, animation, and Zypo styling. Role assignment is a compact select plus an add button at the top of the menu. Moderation commands follow below; mute uses neutral/amber emphasis, while kick and ban use destructive red text. Kick and ban retain the existing confirmation modal. Existing assigned-role chips are removed from the action area because the role summary already communicates assignments; role removal is exposed from the selected role controls in the dropdown.

## Management tabs

The tab strip uses the same `useDragScroll({ speed: 2 })` hook and `drag-scroll viewport overflow-x-auto` classes as Feed topics. Buttons remain `shrink-0`; the scrollbar is hidden on Windows, mouse dragging scrolls on desktop, and native horizontal touch scrolling remains available on mobile.

## Verification

Add a focused source regression test for the shared dropdown and Feed drag-scroll contract. Run TypeScript lint/type checks available in the project, React Doctor on changed React files, and the production build.
