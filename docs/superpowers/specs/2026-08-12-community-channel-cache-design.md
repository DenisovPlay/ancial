# Community channel structure cache

## Goal

Prevent the community-channel skeleton from flashing every time the same community is opened, including communities whose valid channel list is empty.

## Design

- Store the complete validated `CommunityStructure` response through the existing `cache.ts` API.
- Use a cache key containing both `communityId` and the current viewer identity because channel visibility and permissions are viewer-specific.
- Initialize `CommunityChannelShell` synchronously from the cached value with a lazy state initializer.
- Treat an empty `channels` array as valid cached data.
- When cached data exists, render it immediately and refresh from the API in the background.
- When no cached data exists, preserve the existing first-load skeleton.
- On successful API responses, update React state and the cache together.
- On a failed background refresh, keep cached content visible. Hide the shell only when the first request fails without cached data.
- Existing realtime community events continue to fetch and replace the cached structure.
- Use the existing `groups/profile` cache category and its configured TTL; do not add direct `localStorage` access.

## Verification

- Unit-test cache-key isolation and structure validation, including an empty channel list.
- Verify the component initializes from cache and writes successful refreshes.
- Run focused ESLint, TypeScript, React Doctor, and the production build.
- Do not synchronize with GitHub.
