import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canViewPulsePlaylist,
  getPulsePlaylistActionTarget,
  getPulsePlaylistListenTotal,
  getPulsePlaylistTrackEndpoint,
  normalizePulsePlaylistId,
} from './playlist-model.ts';

test('normalizePulsePlaylistId keeps supported ids and falls back to zero', () => {
  assert.equal(normalizePulsePlaylistId('93'), '93');
  assert.equal(normalizePulsePlaylistId('-1'), '-1');
  assert.equal(normalizePulsePlaylistId(''), '0');
  assert.equal(normalizePulsePlaylistId('abc'), '0');
});

test('getPulsePlaylistTrackEndpoint maps generated playlists to gid requests', () => {
  assert.equal(getPulsePlaylistTrackEndpoint('-1'), '/api/pulse/getPlaylist.php?gid=Top');
  assert.equal(getPulsePlaylistTrackEndpoint('-2'), '/api/pulse/getPlaylist.php?gid=New');
  assert.equal(getPulsePlaylistTrackEndpoint('-5'), '/api/pulse/getPlaylist.php?gid=Your');
});

test('getPulsePlaylistTrackEndpoint maps regular playlists to pid requests', () => {
  assert.equal(getPulsePlaylistTrackEndpoint('93'), '/api/pulse/getPlaylist.php?pid=93');
});

test('canViewPulsePlaylist follows legacy private playlist rules', () => {
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '1' }, false), true);
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '3' }, false), false);
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '3' }, true), true);
  assert.equal(canViewPulsePlaylist({ genlist: 'Your', type: '4' }, false), false);
  assert.equal(canViewPulsePlaylist({ genlist: 'Your', type: '4' }, true), true);
});

test('getPulsePlaylistActionTarget keeps legacy play and shuffle semantics', () => {
  assert.deepEqual(getPulsePlaylistActionTarget('93', { genlist: '', type: '1' }), {
    forceReload: false,
    id: '93',
    kind: 'playlist',
    shuffle: 0,
  });

  assert.deepEqual(getPulsePlaylistActionTarget('93', { genlist: '', type: '1' }, { shuffle: true }), {
    forceReload: true,
    id: '93',
    kind: 'playlist',
    shuffle: 1,
  });

  assert.deepEqual(getPulsePlaylistActionTarget('-1', { genlist: 'Top', type: '4' }), {
    forceReload: false,
    id: 'Top',
    kind: 'genlist',
    shuffle: 0,
  });
});

test('getPulsePlaylistListenTotal sums track listens like legacy renderPulsePlaylist', () => {
  assert.equal(getPulsePlaylistListenTotal([
    { listens: '10' },
    { listens: 4 },
    { listens: null },
  ]), 14);
});
