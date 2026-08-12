# Group Call Perfect Negotiation and Media Recovery Design

## Goal

Make group-call media as reliable as one-to-one calls without changing the one-to-one implementation or the group-call layout. Camera and screen-share tracks must reach every participant, recover without a page reload, and never advertise video that is not actually being sent.

## Root Cause

The group-call engine differs from the working one-to-one implementation in four important ways:

- It creates a video transceiver without an initial video track, then relies on later `replaceTrack()` calls.
- A failed `replaceTrack()` is logged and swallowed, after which the client still broadcasts `cam_enabled` or `screen_enabled`.
- Each pair lacks perfect-negotiation state, so overlapping recovery offers and media changes can leave SDP state asymmetric.
- The receiver renders a video element whenever a `MediaStream` object exists, even when that stream contains only audio or a muted video track.

This creates a split-brain state: presence metadata says video is enabled while no outbound RTP video reaches a particular peer. Because every group-call direction has its own sender, one participant can receive video normally while the other sees a grey rectangle.

## Pairwise Connection Model

- Keep one `RTCPeerConnection` per remote participant.
- Keep one stable audio transceiver and one stable video transceiver per peer for the lifetime of that connection.
- Store per-peer negotiation state: `makingOffer`, `ignoreOffer`, `isSettingRemoteAnswerPending`, and a serialized signal queue.
- Select the polite side deterministically from user ids so both clients make the same collision decision.
- Handle offer collisions with rollback on the polite side and ignored offers on the impolite side, matching the proven one-to-one call pattern.
- Queue ICE until a remote description exists, then flush it in order.

## Publishing Media

- Camera and screen sharing replace the track on every live peer video sender.
- A media change succeeds only when all current peer senders accept the track. Failed peers are isolated and rebuilt instead of allowing a partial invisible publication.
- Broadcast `cam_enabled` or `screen_enabled` only after sender replacement succeeds.
- A newly created or rebuilt peer immediately receives the currently active camera or screen track before its offer is generated.
- Replacing camera with screen share, switching cameras, and restoring camera after screen share use the same publication path.
- The sender checks outbound video stats after publication. If `bytesSent` does not increase while the track remains live and enabled, rebuild only that peer connection.

## Recovery Protocol

- Serialize all negotiation and signaling operations per remote user.
- Use perfect negotiation for normal renegotiation and keep the lower numeric user id as the deterministic initiator for a full peer rebuild.
- Keep the addressed `restart` voice signal for requesting a rebuild from the deterministic initiator.
- On `failed`, prolonged `disconnected`, or advertised video without a received live video track, request recovery.
- Also recover when outbound stats show a live local video track but no increasing RTP bytes.
- The deterministic initiator closes the stale peer and creates a fresh offer; the passive client closes its stale peer and sends `restart` to the initiator.
- Rate-limit recovery per peer and cap consecutive attempts so a broken endpoint cannot create an infinite signaling loop.
- Clear recovery timers and counters when the peer connects with expected media, inbound/outbound video proves healthy, the participant leaves, or the call ends.

## Rendering Rules

- A remote tile has playable video only when its stream contains a live, unmuted video track.
- `cam_enabled` and `screen_enabled` remain semantic participant state, not proof that frames have arrived.
- While advertised video is recovering, show the participant fallback instead of a grey `<video>` surface.
- Local preview continues using the active local track and remains muted.

## Media Controls

- Microphone on: neutral microphone. Microphone off: red crossed microphone.
- Camera on: neutral camera. Camera off: red crossed camera. While screen sharing, camera is visibly disabled.
- Screen sharing off: neutral screen-with-arrow. Screen sharing on: purple screen-with-stop symbol.
- Sound on: neutral speaker. Deafened: red crossed speaker.
- Every state has a localized `aria-label` and title; color is never the only state indicator.
- When zero or one camera is available, clicking an enabled camera turns it off directly. The camera dropdown opens only when at least two cameras are available.

## Scope

- Change group calls and, only if required by the existing restart protocol, the WebSocket voice-signal relay.
- Do not change one-to-one call behavior or layout.
- Do not change the existing group-call visual design or focused-video behavior.
- Do not push or synchronize GitHub.

## Verification

- Pure tests cover polite-side selection, offer-collision decisions, live-video detection, deterministic rebuild ownership, and recovery decisions.
- Source tests cover per-peer negotiation state, serialized signaling, successful-publication ordering, outbound RTP supervision, restart signaling, timers, server relay support, icon state variants, and the one-camera dropdown rule.
- Regression tests prove that a stream containing only audio or a muted video track is not rendered as active video.
- Run PHP syntax checks, TypeScript, ESLint, React Doctor, focused tests, and production build.
