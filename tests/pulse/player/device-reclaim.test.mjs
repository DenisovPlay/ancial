import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveReclaim } from './device-reclaim.ts';

const OWN = 'phone-1';

test('reconnected host reclaims its own stale connection instead of turning into a remote', () => {
  assert.equal(resolveReclaim({ activeDeviceId: OWN, activeSelf: false, ownDeviceId: OWN, playingHere: true }), 'claim');
  assert.equal(resolveReclaim({ activeDeviceId: OWN, activeSelf: false, ownDeviceId: OWN, playingHere: false }), 'claim');
});

test('reconnected host yields when another device took playback while it was offline', () => {
  assert.equal(resolveReclaim({ activeDeviceId: 'pc-1', activeSelf: false, ownDeviceId: OWN, playingHere: true }), 'yield');
  assert.equal(resolveReclaim({ activeDeviceId: 'pc-1', activeSelf: false, ownDeviceId: OWN, playingHere: false }), 'yield');
});

test('nobody owns playback: reclaim only when audio is actually playing here', () => {
  assert.equal(resolveReclaim({ activeDeviceId: '', activeSelf: false, ownDeviceId: OWN, playingHere: true }), 'claim');
  assert.equal(resolveReclaim({ activeDeviceId: '', activeSelf: false, ownDeviceId: OWN, playingHere: false }), 'idle');
});

test('server already confirms this connection as active: nothing to do', () => {
  assert.equal(resolveReclaim({ activeDeviceId: OWN, activeSelf: true, ownDeviceId: OWN, playingHere: true }), 'idle');
});
