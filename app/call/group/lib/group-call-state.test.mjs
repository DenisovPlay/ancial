import assert from 'node:assert/strict';

import {
  canFocusParticipant,
  getGroupCallGridClass,
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

console.log('group call state: ok');
