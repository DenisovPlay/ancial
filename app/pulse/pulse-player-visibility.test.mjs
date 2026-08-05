import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldRunPulseFullPlayerWork } from './player/pulse-player-visibility.ts';

test('full-player work is disabled while the player is mini', () => {
  assert.equal(shouldRunPulseFullPlayerWork('mini', true, true), false);
});

test('full-player work is disabled while the player is closed', () => {
  assert.equal(shouldRunPulseFullPlayerWork('full', false, true), false);
  assert.equal(shouldRunPulseFullPlayerWork('full', true, false), false);
});

test('full-player work runs only when full player is actually visible', () => {
  assert.equal(shouldRunPulseFullPlayerWork('full', true, true), true);
});
