# Group Call Pulse Pause Design

## Goal

Pause an actively playing Pulse track when the user opens a group call from a messages dialog, matching the existing one-to-one call behavior.

## Current behavior and root cause

`handleStartCall` in `app/messages/messages-content.tsx` pauses Pulse with `togglePlay()` when `isPlaying` is true before navigating to a one-to-one call. The group-call button navigates immediately and omits that check, so music continues playing after the group-call page opens.

## Design

The group-call button will execute the same guarded pause immediately before `router.push()`:

- call `togglePlay()` only when `isPlaying` is true;
- keep the current track, queue, and playback position intact;
- do not automatically resume playback when the user leaves the call;
- leave call setup, permissions, and routing unchanged.

This is intentionally scoped to the existing messages-dialog entry point so it precisely mirrors the current one-to-one call behavior without introducing a new global route side effect.

## Verification

Add a focused source-wiring regression assertion alongside the group-call tests, then run that test and the project's relevant TypeScript/lint validation. The assertion must confirm that the group-call navigation handler guards `togglePlay()` with `isPlaying` before navigating to `/call/group/`.

## Non-goals

- Closing the Pulse player or clearing the active track.
- Resuming music after a call.
- Changing the behavior of direct group-call URLs.
- Refactoring the shared player context or either call implementation.
