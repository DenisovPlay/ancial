import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_WAVE, applyWavePreset, isDefaultWave, normalizeWave, summarizeWave, toggleInList, toggleWaveLang, withMoods } from './wave-utils.ts';

const label = (group: string, id: string) => `${group}:${id}`;

test('нормализация: мусор убирается, «любой язык» отменяет остальные', () => {
  assert.deepEqual(normalizeWave(null), DEFAULT_WAVE);
  const wave = normalizeWave({ genres: ['Rap', 'Rap'], moods: ['sad'], langs: ['ru', 'xx'], character: 'wild' as never, explicit: false, preset: 'night' });
  assert.deepEqual(wave, { genres: ['Rap'], moods: ['sad'], langs: ['ru'], character: 'balanced', explicit: false, preset: 'night' });
  assert.deepEqual(normalizeWave({ langs: ['ru', 'any'] }).langs, []);
  assert.equal(normalizeWave({ preset: 'bogus' }).preset, null);
});

test('переключатели списков и языка', () => {
  assert.deepEqual(toggleInList(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleInList(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(toggleWaveLang(['ru'], 'any'), []);
  assert.deepEqual(toggleWaveLang([], 'en'), ['en']);
  assert.deepEqual(toggleWaveLang(['ru'], 'ru'), []);
});

test('пресет заполняет настроения, повтор снимает, ручная правка делает «своим»', () => {
  const night = applyWavePreset(DEFAULT_WAVE, 'night');
  assert.equal(night.preset, 'night');
  assert.deepEqual(night.moods, ['dark', 'chill', 'sexy', 'dreamy']);
  assert.deepEqual(applyWavePreset(night, 'night'), { ...DEFAULT_WAVE, preset: null, moods: [] });
  assert.equal(withMoods(night, ['sad']).preset, null);
  assert.equal(applyWavePreset(DEFAULT_WAVE, 'bogus'), DEFAULT_WAVE);
});

test('подпись настроек и признак «по умолчанию»', () => {
  assert.equal(summarizeWave(DEFAULT_WAVE, label), '');
  assert.ok(isDefaultWave(DEFAULT_WAVE));
  const wave = { ...DEFAULT_WAVE, genres: ['Rap', 'Phonk', 'Pop', 'Rock'], moods: ['sad'], langs: ['ru'], character: 'discover' as const };
  assert.equal(summarizeWave(wave, label), 'Rap, Phonk, Pop… · mood:sad · lang:ru · character:discover');
  assert.ok(!isDefaultWave(wave));
});
