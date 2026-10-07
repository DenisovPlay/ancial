import test from 'node:test';
import assert from 'node:assert/strict';

import { serializePostWidgets } from './post-widgets.ts';

test('serializes external music widgets with bridge metadata', () => {
  const payload = JSON.parse(serializePostWidgets([
    {
      type: 'music',
      track_id: 'ext_yandex_12345',
      track_name: 'Song',
      artist_name: 'Artist',
      track_img: 'https://example.test/cover.jpg',
      track_src: 'https://backend.ru.zypo.cc/api/V2/pulse/stream.php?source=yandex&external_id=12345',
      track_genre: 'Pop',
      track_explicit: true,
    },
  ]));

  assert.deepEqual(payload, [
    {
      type: 'music',
      track_ref: 'ext_yandex_12345',
      source: 'yandex',
      external_id: '12345',
      title: 'Song',
      artist: 'Artist',
      img: 'https://example.test/cover.jpg',
      src: 'https://backend.ru.zypo.cc/api/V2/pulse/stream.php?source=yandex&external_id=12345',
      genre: 'Pop',
      explicit: true,
    },
  ]);
});

test('keeps database music widgets as integer track ids', () => {
  const payload = JSON.parse(serializePostWidgets([
    {
      type: 'music',
      track_id: 77,
      track_name: 'Stored',
      artist_name: 'Artist',
      track_img: '/img/noimg.png',
    },
  ]));

  assert.deepEqual(payload, [{ type: 'music', track_id: 77 }]);
});

test('keeps underscores inside external ids', () => {
  const payload = JSON.parse(serializePostWidgets([
    {
      type: 'music',
      track_id: 'ext_yandex_album_12345',
      track_name: 'Song',
      artist_name: 'Artist',
      track_img: '',
    },
  ]));

  assert.equal(payload[0].external_id, 'album_12345');
});
