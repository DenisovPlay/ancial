import assert from 'node:assert/strict';
import test from 'node:test';

import { effectiveAmp, initialWaveState, stepWave, waveOffset, waveTarget } from '../../../app/pulse/wave/wave-motion.ts';

test('цель: пауза спокойнее игры, энергичное быстрее и выше спокойного', () => {
  const idle = waveTarget({ playing: false, mood: 'energetic' });
  const calm = waveTarget({ playing: true, mood: 'calm' });
  const hype = waveTarget({ playing: true, mood: 'energetic', genre: 'Phonk' });
  assert.ok(idle.amp < calm.amp && calm.amp < hype.amp);
  assert.ok(calm.speed < hype.speed);
  assert.deepEqual(waveTarget({ playing: true }).from, waveTarget({ playing: true, mood: 'нет такого' }).from, 'неизвестное — палитра по умолчанию');
});

test('шаг: плавно сходится к цели без рывков, перекат затухает, фаза растёт', () => {
  const start = waveTarget({ playing: false });
  const goal = waveTarget({ playing: true, mood: 'happy' });
  let state = initialWaveState(start);
  const first = stepWave(state, goal, 0.016);
  assert.ok(first.amp > start.amp && first.amp - start.amp < 0.02, 'за кадр — малая доля пути');
  for (let i = 0; i < 400; i++) state = stepWave(state, goal, 0.016);
  assert.ok(Math.abs(state.amp - goal.amp) < 0.01);
  assert.ok(Math.abs(state.from[0] - goal.from[0]) < 1);
  assert.ok(state.phase > 0);
  const kicked = { ...state, kick: 1 };
  assert.ok(effectiveAmp(kicked) > effectiveAmp(state));
  let decayed = kicked;
  for (let i = 0; i < 5; i++) decayed = stepWave(decayed, goal, 0.1);
  assert.ok(decayed.kick < 0.4, 'за полсекунды перекат почти ушёл');
});

test('высота волны: в пределах −1…1, при нулевой амплитуде — ровная линия', () => {
  for (let x = 0; x <= 1; x += 0.05) {
    assert.equal(Math.abs(waveOffset(x, 3, 1, 0)), 0);
    assert.ok(Math.abs(waveOffset(x, 3, 2, 1)) <= 1);
  }
});

test('палитра: по настроению близка к цвету подложки страницы, без настроения — нейтральная', () => {
  assert.deepEqual(waveTarget({ playing: true, mood: 'sad' }).from, [59, 130, 246], 'blue-500 как у страницы');
  assert.deepEqual(waveTarget({ playing: true, mood: 'happy' }).from, [245, 158, 11], 'amber-500');
  assert.deepEqual(waveTarget({ playing: true }).from, [113, 113, 122]);
});
