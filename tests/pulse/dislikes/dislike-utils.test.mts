import assert from 'node:assert/strict';
import test from 'node:test';

import { artistChoices, artistKeysOf, findPlayableIndex, isTrackDisliked, isTrackMarkedItself, matchingDislikedArtists, normalizeArtistKey, parseArtistIds } from '../../../app/pulse/dislikes/dislike-utils.ts';

const none = { trackIds: new Set<number>(), artistKeys: new Set<string>(), artistIds: new Set<number>() };

test('ключ исполнителя: регистр, ё, кавычки, пробелы, знаки по краям', () => {
  assert.equal(normalizeArtistKey('  Big  Baby TAPE '), 'big baby tape');
  assert.equal(normalizeArtistKey('Алёна'), 'алена');
  assert.equal(normalizeArtistKey('O’Connor'), "o'connor");
  assert.equal(normalizeArtistKey('CMH.'), 'cmh');
  assert.equal(normalizeArtistKey(' ,. '), '');
});

test('ключи строки исполнителей: части и целая строка (как на сервере)', () => {
  const keys = artistKeysOf('Eminem, Rihanna');
  assert.ok(keys.includes('eminem') && keys.includes('rihanna') && keys.includes('eminem, rihanna'));
  assert.ok(artistKeysOf('Tyler, The Creator').includes('tyler, the creator'));
  for (const name of ['slava kpss', 'dk', 'lida', 'cmh']) {
    assert.ok(artistKeysOf('Slava KPSS feat. DK & Lida x CMH').includes(name), name);
  }
});

test('трек отмечен: по id, по исполнителю в составе и по карточке', () => {
  assert.equal(isTrackDisliked({ sid: '10', artist: 'Anyone' }, { ...none, trackIds: new Set([10]) }), true);
  assert.equal(isTrackDisliked({ sid: 11, artist: 'Eminem, Rihanna' }, { ...none, artistKeys: new Set(['rihanna']) }), true);
  assert.equal(isTrackDisliked({ sid: 12, artist: 'X', artists_ids: ['3', '7'] }, { ...none, artistIds: new Set([7]) }), true);
  assert.equal(isTrackDisliked({ sid: 13, artist: 'X', artists_ids: '3,7' }, { ...none, artistIds: new Set([7]) }), true);
});

test('трек не отмечен: похожее имя, виртуальный sid, пусто', () => {
  const sets = { trackIds: new Set([10]), artistKeys: new Set(['rihanna']), artistIds: new Set([7]) };
  assert.equal(isTrackDisliked({ sid: 14, artist: 'Rihanna Fan Club Orchestra', artists_ids: ['1'] }, sets), false);
  assert.equal(isTrackDisliked({ sid: 'ext_yandex_5', artist: 'Someone' }, sets), false);
  assert.equal(isTrackDisliked(null, sets), false);
  assert.equal(isTrackDisliked({ sid: 1, artist: '' }, none), false);
});

test('виртуальный sid отмечается в этой сессии', () => {
  const sets = { ...none, virtualSids: new Set(['ext_yandex_5']) };
  assert.equal(isTrackDisliked({ sid: 'ext_yandex_5', artist: 'X' }, sets), true);
  assert.equal(isTrackDisliked({ sid: 'ext_yandex_6', artist: 'X' }, sets), false);
});

test('выбор исполнителя: id карточки только при совпадении количества', () => {
  assert.deepEqual(artistChoices({ artist: 'A, B', artists_ids: [5, 6] }), [{ name: 'A', id: 5 }, { name: 'B', id: 6 }]);
  assert.deepEqual(artistChoices({ artist: 'A, B', artists_ids: [5] }), [{ name: 'A', id: null }, { name: 'B', id: null }]);
  assert.deepEqual(artistChoices({ artist: 'Solo' }), [{ name: 'Solo', id: null }]);
  assert.deepEqual(parseArtistIds('3, x, 0, 9'), [3, 9]);
});

test('автопропуск очереди: ищем следующий/предыдущий не отмеченный трек', () => {
  const list = [1, 2, 3, 4, 5];
  const skipped = (n: number) => n === 2 || n === 3;
  assert.equal(findPlayableIndex(list, 1, 1, skipped), 3);
  assert.equal(findPlayableIndex(list, 2, -1, skipped), 0);
  assert.equal(findPlayableIndex(list, 4, 1, skipped), 4);
  assert.equal(findPlayableIndex(list, 5, 1, skipped), -1);
  assert.equal(findPlayableIndex(list, 2, 1, () => true), -1);
  assert.equal(findPlayableIndex([], 0, 1, skipped), -1);
});

test('отметка самого трека отличается от отметки исполнителя', () => {
  const sets = { trackIds: new Set([10]), artistKeys: new Set(['rihanna']), artistIds: new Set<number>(), virtualSids: new Set(['ext_yandex_5']) };
  assert.equal(isTrackMarkedItself({ sid: 10, artist: 'X' }, sets), true);
  assert.equal(isTrackMarkedItself({ sid: 11, artist: 'Rihanna' }, sets), false);
  assert.equal(isTrackMarkedItself({ sid: 'ext_yandex_5', artist: 'X' }, sets), true);
  assert.equal(isTrackMarkedItself(null, sets), false);
});

test('исполнители, под которых подпадает трек', () => {
  const artists = [
    { key: 'rihanna', artistId: null, label: 'Rihanna' },
    { key: 'someone', artistId: 7, label: 'Someone' },
    { key: 'other', artistId: null, label: 'Other' },
  ];
  assert.deepEqual(matchingDislikedArtists({ sid: 1, artist: 'Eminem, Rihanna', artists_ids: '7' }, artists).map((a) => a.label), ['Rihanna', 'Someone']);
  assert.deepEqual(matchingDislikedArtists({ sid: 1, artist: 'Nobody' }, artists), []);
  assert.deepEqual(matchingDislikedArtists(null, artists), []);
});
