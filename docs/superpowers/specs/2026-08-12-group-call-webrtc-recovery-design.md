# Group Call WebRTC Recovery and Media Controls Design

## Goal

Recover intermittent missing group-call media without reloading the page and make every media control communicate its current state clearly.

## Root Cause

Group-call signaling currently processes offer, answer, and ICE messages in independent asynchronous tasks. ICE can be queued after an offer handler has already flushed the queue, leaving the candidate stranded. Failed peers are closed and disconnected peers are ignored, so neither condition creates a new offer. A connected peer that never receives an advertised video track also has no recovery path.

## Recovery Protocol

- Serialize signaling operations per remote user.
- The lower numeric user id is the deterministic offer initiator for a peer pair.
- Add an addressed `restart` voice signal that contains no SDP or ICE payload.
- On `failed`, prolonged `disconnected`, or advertised video without a received live video track, request recovery.
- The deterministic initiator closes the stale peer and creates a fresh offer with ICE restart; the passive client sends `restart` to the initiator.
- Rate-limit recovery per peer and cap consecutive attempts so a broken endpoint cannot create an infinite signaling loop.
- Clear recovery timers and counters when the peer connects, a live video track arrives, the participant leaves, or the call ends.

## Media Controls

- Microphone on: neutral microphone. Microphone off: red crossed microphone.
- Camera on: neutral camera. Camera off: red crossed camera. While screen sharing, camera is visibly disabled.
- Screen sharing off: neutral screen-with-arrow. Screen sharing on: purple screen-with-stop symbol.
- Sound on: neutral speaker. Deafened: red crossed speaker.
- Every state has a localized `aria-label` and title; color is never the only state indicator.
- When zero or one camera is available, clicking an enabled camera turns it off directly. The camera dropdown opens only when at least two cameras are available.

## Scope

- Change group calls and the WebSocket voice-signal relay only.
- Do not change one-to-one call behavior or layout.
- Do not push or synchronize GitHub.

## Verification

- Pure tests cover deterministic offer ownership and recovery decisions.
- Source tests cover per-peer serialization, restart signaling, timers, server relay support, icon state variants, and the one-camera dropdown rule.
- Run PHP syntax checks, TypeScript, ESLint, React Doctor, focused tests, and production build.

