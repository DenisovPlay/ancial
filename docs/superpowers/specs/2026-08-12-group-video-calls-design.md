# Group video calls

## Goal

Turn community voice channels into full group calls with the existing Zypo call appearance, cameras, screen sharing, and up to eight participants, without changing one-to-one calls.

## Entry and routing

- A community voice channel opens `/call/group/[hash]` in the current tab.
- The route resolves the linked channel dialog by its existing non-numeric hash and validates access through the existing dialog/community permission path.
- Leaving the group call returns to the previous page when browser history is available and falls back to the linked community page.
- App navigation and the Pulse player remain hidden on the call page, matching `/call/[hash]`.

## User experience

- Preserve the visual language of `/call/[hash]`: black full-screen surface, gradient header, floating rounded control bar, Zypo borders, blur, colors, and motion.
- Replace the single remote-video canvas with an adaptive grid containing every participant, including the local participant.
- Do not render the separate floating local preview in group mode.
- One participant fills the available grid area. Two participants use two balanced tiles. Three or four use a two-column layout. Five through eight use an adaptive layout that remains usable on mobile and desktop.
- A tile displays the participant's camera or screen share. When neither is active, it displays their avatar, name, and connection state.
- Microphone, camera, and screen-sharing state indicators are displayed on the participant tile.
- Multiple participants may share their screens simultaneously; each share remains inside its owner's tile.
- The control bar contains microphone, camera/device selection, screen sharing, deafen, and leave controls.
- The microphone starts enabled when the user has `speak_voice`; the camera starts disabled.
- Users without `speak_voice` join in listen-only mode and cannot publish microphone, camera, or screen media.

## Media architecture

- Keep `/call/[hash]` and its existing one-to-one signaling and component unchanged.
- Extend the existing `voice:signal` group mesh rather than adapting the one-to-one `call:signal` flow.
- Keep the existing eight-participant server limit.
- Each participant maintains one `RTCPeerConnection` per remote participant.
- Peer connections publish audio plus a stable video transceiver. Camera and screen-share tracks replace the transceiver's sender track so toggling media does not require recreating the room.
- The local media stream and every remote participant stream are rendered by dedicated video-tile components.
- Screen sharing replaces the local camera track. When sharing stops, the previously selected camera is restored if it was enabled; otherwise the video sender returns to no track.
- TURN configuration continues to come from the existing calls TURN endpoint.
- All acquired media tracks, peer connections, object references, listeners, and dialog subscriptions are released on leave and unmount.

## Signaling

- Extend voice participant state with `cam_enabled` and `screen_enabled` while retaining `mic_enabled`.
- Extend `join`, `snapshot`, `status`, `participant_joined`, and `media` voice messages with the new state where applicable.
- SDP offers, answers, and ICE candidates continue to be routed only to an authenticated target currently present in the same voice room.
- The server remains authoritative for room membership and permissions.
- Publishing any enabled media requires `speak_voice`; `connect_voice` remains the gate for joining/listening.
- Reconnect clears stale peer connections, rejoins the room, receives a fresh snapshot, and rebuilds the mesh.

## Data and identity

- The page loads dialog/channel metadata and participant profiles from existing V2 APIs; it does not trust names or avatars received through WebSocket signaling.
- The community return URL is derived from the linked community metadata when available.
- Missing avatars use the existing Zypo fallback asset.

## Failure handling

- Denied microphone access shows the existing media-access flow and allows a retry.
- Denied camera or screen permission keeps the call connected and shows a localized notification.
- TURN/signaling/join failures show localized errors and cleanly return to a disconnected state.
- A moderation disconnect immediately stops local media, closes peers, and leaves the page.
- A participant losing channel access is disconnected by the existing server-side community checks.

## Localization and accessibility

- All new visible copy is added to `app/locales/ru.ts` and `app/locales/en.ts` and consumed through `useAuth().lang`.
- Media controls are semantic buttons with localized accessible labels and visible state.
- Video elements use `playsInline`; the local tile is muted to prevent feedback.
- Motion respects the current Zypo duration conventions and avoids changing the one-to-one call experience.

## Verification

- Unit-test grid selection and normalized participant media state.
- PHP-test server snapshot/media validation and `speak_voice` enforcement.
- Type-check, lint changed files, run React Doctor on changed files, and run a production build.
- Manually verify two and three simultaneous browser sessions: join/leave, microphone, camera, screen sharing, reconnect, listen-only access, and moderator disconnect.
- Do not push, create a pull request, or otherwise synchronize with GitHub.
