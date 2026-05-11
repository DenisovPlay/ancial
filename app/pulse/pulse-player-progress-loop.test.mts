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

test('Pulse player keeps seek visuals smooth without React state on every frame', async () => {
  const source = await readFile(new URL('../context/PulsePlayerContext.tsx', import.meta.url), 'utf8');
  const visualSource = source.slice(
    source.indexOf('const syncVisualProgress'),
    source.indexOf('const stopProgressLoop'),
  );

  assert.match(source, /mobileSeekInputRef/);
  assert.match(source, /desktopSeekInputRef/);
  assert.match(source, /mobileCurrentTimeLabelRef/);
  assert.match(source, /desktopCurrentTimeLabelRef/);
  assert.match(visualSource, /visualProgressFrameRef/);
  assert.match(visualSource, /window\.requestAnimationFrame\(tick\)/);
  assert.equal(visualSource.includes('setCurrentTime'), false);
  assert.equal(visualSource.includes('setSeekValue'), false);
  assert.equal(visualSource.includes('setDuration'), false);
  assert.equal(visualSource.includes('updateMediaPositionState'), false);
});

test('Pulse lyric fill animates only the currently filling word', async () => {
  const source = await readFile(new URL('../context/PulsePlayerContext.tsx', import.meta.url), 'utf8');
  const globals = await readFile(new URL('../globals.css', import.meta.url), 'utf8');
  const lyricRenderSource = source.slice(
    source.indexOf('function renderLyricWords'),
    source.indexOf('type PulseMobileLyricEntry'),
  );
  const progressInterval = Number(source.match(/const PLAYER_PROGRESS_LOOP_INTERVAL_MS = (\d+);/)?.[1]);
  const lyricTransition = Number(source.match(/const PLAYER_LYRIC_FILL_TRANSITION_MS = (\d+);/)?.[1]);

  assert.match(globals, /@property --pulse-lyric-fill/);
  assert.ok(Number.isFinite(progressInterval));
  assert.ok(Number.isFinite(lyricTransition));
  assert.ok(lyricTransition < progressInterval);
  assert.match(lyricRenderSource, /const isCurrentWordFill = isActive && fill > 0 && fill < 100;/);
  assert.match(lyricRenderSource, /--pulse-lyric-fill/);
  assert.match(lyricRenderSource, /transition: isCurrentWordFill\s*\?\s*`--pulse-lyric-fill \$\{PLAYER_LYRIC_FILL_TRANSITION_MS\}ms linear`\s*:\s*'none'/);
  assert.match(lyricRenderSource, /var\(--pulse-lyric-fill\)/);
});
