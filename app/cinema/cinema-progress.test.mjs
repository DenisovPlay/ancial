import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPlaybackSlotKey,
  isLikelyCinemaContentDuration,
  mergeCinemaProgress,
  normalizeCinemaProgressState,
  parseFlixPlaybackPayload,
  resolveResumeTime,
  selectCinemaProgressState,
} from './cinema-progress.ts';

test('player changes preserve the current episode position', () => {
  const existing = {
    season: 1,
    episode: 2,
    playerId: 'flixcdn',
    time: 420,
    currentTime: 420,
    duration: 2400,
    positions: {
      's1:e2': { time: 420, duration: 2400, updatedAt: 1 },
    },
  };

  const next = mergeCinemaProgress(existing, {
    type: 'series',
    season: 1,
    episode: 2,
    playerId: 'videohub',
  }, 2);

  assert.equal(next.playerId, 'videohub');
  assert.equal(next.currentTime, 420);
  assert.equal(next.positions['s1:e2'].time, 420);
});

test('a new episode starts at zero without losing the previous episode position', () => {
  const existing = {
    season: 1,
    episode: 2,
    time: 420,
    currentTime: 420,
    duration: 2400,
    positions: {
      's1:e2': { time: 420, duration: 2400, updatedAt: 1 },
    },
  };

  const next = mergeCinemaProgress(existing, {
    type: 'series',
    season: 1,
    episode: 3,
  }, 2);

  assert.equal(next.currentTime, 0);
  assert.equal(next.duration, 0);
  assert.equal(next.positions['s1:e2'].time, 420);
  assert.equal(next.positions['s1:e3'], undefined);
});

test('anime episodes use separate season and episode slots', () => {
  const next = mergeCinemaProgress({
    season: 1,
    episode: 1,
    time: 405,
    currentTime: 405,
    duration: 1400,
  }, {
    type: 'anime',
    season: 1,
    episode: 2,
  }, 2);

  assert.equal(next.currentTime, 0);
  assert.equal(next.positions['s1:e1'].time, 405);
  assert.equal(next.positions['s1:e2'], undefined);
});

test('explicit episodic content keeps cartoon episodes separate', () => {
  const next = mergeCinemaProgress({
    season: 1,
    episode: 1,
    time: 405,
    currentTime: 405,
    duration: 1400,
  }, {
    type: 'cartoons',
    isEpisodic: true,
    season: 1,
    episode: 2,
  }, 2);

  assert.equal(next.currentTime, 0);
  assert.equal(next.positions['s1:e1'].time, 405);
});

test('info UI reads only the selected episode slot', () => {
  const selected = selectCinemaProgressState({
    season: 1,
    episode: 2,
    time: 405,
    currentTime: 405,
    positions: {
      's1:e1': { time: 405, duration: 1400, updatedAt: 1 },
    },
  }, true, 1, 2);

  assert.equal(selected.time, 0);
  assert.equal(selected.currentTime, 0);
});

test('legacy movie slot is never copied into an episode', () => {
  const next = mergeCinemaProgress({
    season: 1,
    episode: 2,
    time: 405,
    currentTime: 405,
    positions: {
      movie: { time: 405, duration: 1400, updatedAt: 1 },
    },
  }, {
    type: 'cartoons',
    isEpisodic: true,
    season: 1,
    episode: 2,
  }, 2);

  assert.equal(next.currentTime, 0);
  assert.equal(next.positions['s1:e2'], undefined);
});

test('returning to an earlier episode restores its own position', () => {
  const progress = {
    season: 1,
    episode: 3,
    time: 80,
    currentTime: 80,
    duration: 2200,
    positions: {
      's1:e2': { time: 420, duration: 2400, updatedAt: 1 },
      's1:e3': { time: 80, duration: 2200, updatedAt: 2 },
    },
  };

  assert.equal(resolveResumeTime(undefined, progress, true, 1, 2), 420);
  assert.equal(resolveResumeTime(undefined, progress, true, 1, 4), 0);
});

test('fresh stored progress wins over a stale time query after switching players', () => {
  const progress = {
    season: 1,
    episode: 2,
    positions: {
      's1:e2': { time: 630, duration: 2400, updatedAt: 2 },
    },
  };

  assert.equal(resolveResumeTime(420, progress, true, 1, 2), 630);
});

test('UI progress normalization keeps the timestamp after repeated selection updates', () => {
  assert.deepEqual(
    normalizeCinemaProgressState({
      season: 1,
      episode: 2,
      playerId: 'videohub',
      currentTime: 630,
      duration: 2400,
    }),
    {
      season: 1,
      episode: 2,
      playerId: 'videohub',
      time: 630,
      currentTime: 630,
      duration: 2400,
    },
  );
});

test('late cleanup saves the old episode without reselecting it', () => {
  const next = mergeCinemaProgress({
    season: 1,
    episode: 3,
    positions: {},
  }, {
    type: 'series',
    season: 1,
    episode: 2,
    currentTime: 420,
    durationSeconds: 2400,
    preserveActiveSelection: true,
  }, 2);

  assert.equal(next.episode, 3);
  assert.equal(next.currentTime, 0);
  assert.equal(next.positions['s1:e2'].time, 420);
});

test('legacy progress is migrated into the episode it belongs to', () => {
  const next = mergeCinemaProgress({
    season: 2,
    episode: 5,
    time: 300,
    currentTime: 300,
    duration: 2100,
  }, {
    type: 'series',
    season: 2,
    episode: 6,
  }, 2);

  assert.equal(next.positions['s2:e5'].time, 300);
  assert.equal(next.currentTime, 0);
});

test('cinema content duration rejects FlixCDN prerolls', () => {
  assert.equal(isLikelyCinemaContentDuration(30), false);
  assert.equal(isLikelyCinemaContentDuration(120), false);
  assert.equal(isLikelyCinemaContentDuration(179), false);
  assert.equal(isLikelyCinemaContentDuration(180), true);
  assert.equal(isLikelyCinemaContentDuration(300), true);
  assert.equal(isLikelyCinemaContentDuration(5400), true);
});

test('FlixCDN payload accepts numeric strings and nested playback data', () => {
  assert.deepEqual(
    parseFlixPlaybackPayload({ currentTime: '42.5', duration: '2400' }),
    { time: 42.5, duration: 2400 },
  );
  assert.deepEqual(
    parseFlixPlaybackPayload({ data: { position: 55, totalTime: '1800' } }),
    { time: 55, duration: 1800 },
  );
});

test('movie and episode slots cannot collide', () => {
  assert.equal(getPlaybackSlotKey(false, 1, 1), 'movie');
  assert.equal(getPlaybackSlotKey(true, 1, 1), 's1:e1');
});
