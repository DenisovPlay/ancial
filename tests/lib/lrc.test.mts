import test from 'node:test';
import assert from 'node:assert/strict';

const { parseLyricsText, isSyncedLyrics, formatLrcTime, parseLrcDraft, buildLrc, draftToText, UNSYNCED_TIME } = await import('./lrc.ts');

test('синхронизированный текст сортируется и начинается с ♪', () => {
  const lines = parseLyricsText('[00:05.00]Второй\n[00:02.50]Первый\n[00:07.00]');
  assert.deepEqual(lines, [
    { text: '♪', time: 0 },
    { text: 'Первый', time: 2.5 },
    { text: 'Второй', time: 5 },
  ]);
  assert.equal(isSyncedLyrics(lines), true);
});

test('простой текст — без фальшивых тайм-кодов и служебных тегов', () => {
  const lines = parseLyricsText('[ar:Кто-то]\nРаз\n\nДва');
  assert.deepEqual(lines, [
    { text: 'Раз', time: UNSYNCED_TIME },
    { text: 'Два', time: UNSYNCED_TIME },
  ]);
  assert.equal(isSyncedLyrics(lines), false);
  assert.equal(isSyncedLyrics([]), false);
});

test('formatLrcTime', () => {
  assert.equal(formatLrcTime(0), '00:00.00');
  assert.equal(formatLrcTime(83.456), '01:23.45');
  assert.equal(formatLrcTime(0.29), '00:00.29');
  assert.equal(formatLrcTime(-3), '00:00.00');
});

test('редактор: разбор и сборка туда-обратно', () => {
  const draft = parseLrcDraft('[ti:Песня]\r\n[00:01.20] Раз\nДва\n\n');
  assert.deepEqual(draft, [
    { text: 'Раз', time: 1.2 },
    { text: 'Два', time: null },
  ]);
  // Не все строки отмечены — сохраняется простой текст, а в поле редактора разметка остаётся.
  assert.equal(buildLrc(draft), 'Раз\nДва');
  assert.equal(draftToText(draft), '[00:01.20]Раз\nДва');
  const synced = [{ text: 'Раз', time: 1.2 }, { text: 'Два', time: 65 }];
  assert.equal(buildLrc(synced), '[00:01.20]Раз\n[01:05.00]Два');
  assert.deepEqual(parseLrcDraft(buildLrc(synced)), synced);
});
