# Group info leave button layout

## Goal

Make the destructive “Leave” action visually distinct from the three primary group-management actions in the group information modal.

## Design

- For administrators and owners, keep Invite, Edit, and Chat settings in a three-column row.
- Place Leave on the next row and span it across the complete action grid.
- Preserve the existing two-column layout for regular members.
- Replace the dynamically constructed Tailwind grid-column class with explicit static class names so production CSS generation can detect both variants.
- Preserve the existing button behavior, colors, labels, loading state, spacing, animation, and accessibility semantics.

## Verification

- Run TypeScript checking.
- Run focused ESLint for the changed component.
- Run React Doctor against changed code and confirm the change introduces no regression.
- Confirm the Git worktree remains local and is not pushed.
