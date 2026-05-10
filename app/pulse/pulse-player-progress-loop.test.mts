import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Pulse player progress loop is not tied to animation frames', async () => {
  const source = await readFile(new URL('../context/PulsePlayerContext.tsx', import.meta.url), 'utf8');
  const loopSource = source.slice(
    source.indexOf('const stopProgressLoop'),
    source.indexOf('const showPlayer'),
  );

  assert.match(loopSource, /PLAYER_PROGRESS_LOOP_INTERVAL_MS/);
  assert.match(loopSource, /window\.clearTimeout\(progressLoopRef\.current\)/);
  assert.match(loopSource, /window\.setTimeout\(tick, PLAYER_PROGRESS_LOOP_INTERVAL_MS\)/);
  assert.equal(loopSource.includes('requestAnimationFrame'), false);
});

test('Pulse player does not update Media Session position on every progress tick', async () => {
  const source = await readFile(new URL('../context/PulsePlayerContext.tsx', import.meta.url), 'utf8');
  const syncSource = source.slice(
    source.indexOf('const syncTrackProgress'),
    source.indexOf('const stopProgressLoop'),
  );

  assert.match(syncSource, /PLAYER_MEDIA_POSITION_UPDATE_INTERVAL_MS/);
  assert.match(syncSource, /lastMediaPositionUpdateRef/);
  assert.match(syncSource, /forceProgressUpdate/);
});
