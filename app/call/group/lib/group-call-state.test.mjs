import assert from 'node:assert/strict';

import {
  canFocusParticipant,
  getGroupCallGridClass,
  hasOutboundVideoProgress,
  hasPlayableVideoTrack,
  isPolitePeer,
  isGroupCallOfferer,
  resolveOfferCollision,
  shouldRecoverPeer,
  normalizeParticipant,
  resolveFocusedParticipantId,
  updateParticipantMedia,
} from './group-call-state.ts';

assert.equal(getGroupCallGridClass(1), 'grid-cols-1');
assert.equal(getGroupCallGridClass(2), 'grid-cols-1 sm:grid-cols-2');
assert.equal(getGroupCallGridClass(4), 'grid-cols-1 sm:grid-cols-2');
assert.equal(getGroupCallGridClass(6), 'grid-cols-2 lg:grid-cols-3');
assert.equal(getGroupCallGridClass(8), 'grid-cols-2 lg:grid-cols-4');

assert.deepEqual(normalizeParticipant({ user_id: '7', mic_enabled: 1 }), {
  user_id: 7,
  mic_enabled: true,
  cam_enabled: false,
  screen_enabled: false,
});
assert.equal(normalizeParticipant({ user_id: 0 }), null);

assert.deepEqual(
  updateParticipantMedia(
    [{ user_id: 7, mic_enabled: true, cam_enabled: false, screen_enabled: false }],
    7,
    { mic_enabled: false, cam_enabled: true, screen_enabled: false },
  ),
  [{ user_id: 7, mic_enabled: false, cam_enabled: true, screen_enabled: false }],
);

const cameraParticipant = { user_id: 7, mic_enabled: true, cam_enabled: true, screen_enabled: false };
const screenParticipant = { user_id: 8, mic_enabled: true, cam_enabled: false, screen_enabled: true };
const audioParticipant = { user_id: 9, mic_enabled: true, cam_enabled: false, screen_enabled: false };

assert.equal(canFocusParticipant(cameraParticipant), true);
assert.equal(canFocusParticipant(screenParticipant), true);
assert.equal(canFocusParticipant(audioParticipant), false);
assert.equal(resolveFocusedParticipantId(7, [cameraParticipant, screenParticipant]), 7);
assert.equal(resolveFocusedParticipantId(7, [{ ...cameraParticipant, cam_enabled: false }]), null);
assert.equal(resolveFocusedParticipantId(7, [screenParticipant]), null);
assert.equal(resolveFocusedParticipantId(null, [cameraParticipant]), null);
assert.equal(isGroupCallOfferer(3, 8), true);
assert.equal(isGroupCallOfferer(8, 3), false);
assert.equal(shouldRecoverPeer('failed', 0), true);
assert.equal(shouldRecoverPeer('disconnected', 2), true);
assert.equal(shouldRecoverPeer('connected', 2), false);
assert.equal(shouldRecoverPeer('failed', 3), false);

assert.equal(isPolitePeer(8, 3), true);
assert.equal(isPolitePeer(3, 8), false);
assert.deepEqual(
  resolveOfferCollision({
    isPolite: true,
    makingOffer: true,
    signalingState: 'have-local-offer',
    isSettingRemoteAnswerPending: false,
  }),
  { collision: true, ignore: false, rollback: true },
);
assert.deepEqual(
  resolveOfferCollision({
    isPolite: false,
    makingOffer: true,
    signalingState: 'have-local-offer',
    isSettingRemoteAnswerPending: false,
  }),
  { collision: true, ignore: true, rollback: false },
);
assert.deepEqual(
  resolveOfferCollision({
    isPolite: true,
    makingOffer: false,
    signalingState: 'stable',
    isSettingRemoteAnswerPending: true,
  }),
  { collision: false, ignore: false, rollback: false },
);

assert.equal(hasPlayableVideoTrack([]), false);
assert.equal(hasPlayableVideoTrack([{ kind: 'audio', readyState: 'live', muted: false }]), false);
assert.equal(hasPlayableVideoTrack([{ kind: 'video', readyState: 'live', muted: true }]), false);
assert.equal(hasPlayableVideoTrack([{ kind: 'video', readyState: 'ended', muted: false }]), false);
assert.equal(hasPlayableVideoTrack([{ kind: 'video', readyState: 'live', muted: false }]), true);

assert.equal(hasOutboundVideoProgress(120, 121), true);
assert.equal(hasOutboundVideoProgress(120, 120), false);
assert.equal(hasOutboundVideoProgress(null, 120), false);

console.log('group call state: ok');
