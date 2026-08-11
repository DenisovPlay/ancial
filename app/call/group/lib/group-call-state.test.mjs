import assert from 'node:assert/strict';

import {
  getGroupCallGridClass,
  normalizeParticipant,
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

console.log('group call state: ok');
