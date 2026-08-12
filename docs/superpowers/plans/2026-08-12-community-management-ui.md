# Compact Community Management UI Implementation Plan

**Goal:** Replace the duplicated channel detail card with direct channel rows and split large management forms into responsive workspaces.

**Architecture:** `CommunityChannelShell` keeps join/navigation ownership while `CommunityChannelList` emits the clicked channel. `CommunityManageModal` owns responsive navigation and workspace state; channel and role editors render only the selected overview or tool.

## Tasks

1. Add failing UI contract assertions for direct row opening, absence of `CommunityChannelView`, a wide modal, desktop navigation, and in-modal tool workspaces.
2. Connect channel rows directly to the existing `openChannel` operation and delete the redundant selected-channel rendering.
3. Add desktop navigation and mobile tabs to the wide management modal.
4. Split channel creation, category management, channel permissions, and role creation into back-navigable workspaces.
5. Add localized labels and run focused tests, TypeScript, ESLint, React Doctor, and production build.

## Constraints

- Do not change community APIs, permissions, or join semantics.
- Do not change the phone modal alignment.
- Work directly in local `main` and do not push GitHub.
