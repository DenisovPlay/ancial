import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canUploadToPulseFavoritesPlaylist,
  canViewPulsePlaylist,
  getPulsePlaylistActionTarget,
  getPulsePlaylistCacheKey,
  getPulsePlaylistListenTotal,
  getPulsePlaylistTrackEndpoint,
  getPulsePlaylistTracksCacheKey,
  canManagePulseTrack,
  getPulseTrackEditInitialState,
  getPulseTrackUploadPayload,
  normalizePulsePlaylistId,
} from './playlist-model.ts';
import * as playlistModel from './playlist-model.ts';

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
  assert.equal(getPulsePlaylistTrackEndpoint('777', { genlist: 'Mood', type: '4' }), '/api/pulse/getPlaylist.php?gid=Mood');
});

test('getPulsePlaylistTrackEndpoint maps regular playlists to pid requests', () => {
  assert.equal(getPulsePlaylistTrackEndpoint('93'), '/api/pulse/getPlaylist.php?pid=93');
});

test('playlist cache keys follow legacy renderPulsePlaylistPage and renderPulsePlaylist names', () => {
  assert.equal(getPulsePlaylistCacheKey('93'), 'playlist_93');
  assert.equal(getPulsePlaylistTracksCacheKey('93', { genlist: '', type: '1' }), 'playlist_tracks_93');
  assert.equal(getPulsePlaylistTracksCacheKey('-5', { genlist: 'Your', type: '4' }), 'playlist_tracks_gid_Your');
  assert.equal(getPulsePlaylistTracksCacheKey('777', { genlist: '', type: '5' }, '12'), 'playlist_tracks_aid_12');
});

test('canViewPulsePlaylist follows legacy private playlist rules', () => {
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '1' }, false), true);
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '3' }, false), false);
  assert.equal(canViewPulsePlaylist({ genlist: '', type: '3' }, true), true);
  assert.equal(canViewPulsePlaylist({ genlist: 'Your', type: '4' }, false), false);
  assert.equal(canViewPulsePlaylist({ genlist: 'Your', type: '4' }, true), true);
});

test('canUploadToPulseFavoritesPlaylist preserves the legacy upload button rules', () => {
  assert.equal(canUploadToPulseFavoritesPlaylist('-5', { genlist: 'Your', type: '4' }), true);
  assert.equal(canUploadToPulseFavoritesPlaylist('120', { genlist: '', type: '3' }), true);
  assert.equal(canUploadToPulseFavoritesPlaylist('93', { genlist: '', type: '1' }), false);
  assert.equal(canUploadToPulseFavoritesPlaylist('-1', { genlist: 'Top', type: '4' }), false);
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

test('getPulseTrackUploadPayload matches legacy upload_track.php field names', () => {
  const payload = getPulseTrackUploadPayload({
    artist: ' Artist ',
    explicit: '',
    image: 'https://img.example/cover.jpg',
    lang: '',
    name: '',
    trackId: ' abc123 ',
  });

  assert.equal(payload.get('trackname'), 'Неизвестный трек');
  assert.equal(payload.get('trackartist'), 'Artist');
  assert.equal(payload.get('trackimg'), 'https://img.example/cover.jpg');
  assert.equal(payload.get('tracklang'), '--');
  assert.equal(payload.get('trackexp'), '0');
  assert.equal(payload.get('trackid'), 'abc123');
});

test('canManagePulseTrack follows legacy uploaded_by ownership rule', () => {
  assert.equal(canManagePulseTrack({ uploaded_by: '42' }, { id: 42 }), true);
  assert.equal(canManagePulseTrack({ uploaded_by: 42 }, { id: '42' }), true);
  assert.equal(canManagePulseTrack({ uploaded_by: '41' }, { id: 42 }), false);
  assert.equal(canManagePulseTrack({ uploaded_by: null }, { id: 42 }), false);
});

test('getPulseTrackEditInitialState maps an existing track to update_track.php fields', () => {
  assert.deepEqual(getPulseTrackEditInitialState({
    artist: 'Artist',
    artwork: [{ src: 'https://img.example/cover.jpg' }],
    explicit: true,
    lang: 'ru',
    sid: '777',
    title: 'Track',
  }), {
    artist: 'Artist',
    explicit: '1',
    image: 'https://img.example/cover.jpg',
    lang: 'ru',
    name: 'Track',
    trackId: '777',
  });
});

test('getPulseTrackDropdownZIndex keeps open menus above following track buttons', () => {
  const getPulseTrackDropdownZIndex = playlistModel.getPulseTrackDropdownZIndex;

  assert.equal(typeof getPulseTrackDropdownZIndex, 'function');
  assert.ok(getPulseTrackDropdownZIndex(0, false) > getPulseTrackDropdownZIndex(1, false));
  assert.ok(getPulseTrackDropdownZIndex(5, true) > getPulseTrackDropdownZIndex(0, false));
  assert.equal(getPulseTrackDropdownZIndex(Number.NaN, false), getPulseTrackDropdownZIndex(0, false));
});

test('getPulsePlaylistManagePayload matches legacy playlist_manage.php fields', () => {
  const getPulsePlaylistManagePayload = playlistModel.getPulsePlaylistManagePayload;

  assert.equal(typeof getPulsePlaylistManagePayload, 'function');

  const createPayload = getPulsePlaylistManagePayload({
    image: '',
    name: '  Новый плейлист  ',
  });
  assert.equal(createPayload.get('action'), 'create');
  assert.equal(createPayload.get('id'), null);
  assert.equal(createPayload.get('img'), null);
  assert.equal(createPayload.get('name'), 'Новый плейлист');

  const updatePayload = getPulsePlaylistManagePayload({
    id: ' 93 ',
    image: ' https://img.example/cover.jpg ',
    name: '  Старый плейлист  ',
  });
  assert.equal(updatePayload.get('action'), 'update');
  assert.equal(updatePayload.get('id'), '93');
  assert.equal(updatePayload.get('img'), 'https://img.example/cover.jpg');
  assert.equal(updatePayload.get('name'), 'Старый плейлист');
});
