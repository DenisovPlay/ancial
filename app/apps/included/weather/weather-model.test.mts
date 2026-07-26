import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWeatherMapLinks,
  buildWeatherMedia,
  detectWeatherKey,
  getForecastIconKey,
  getDayOfMonthAfter,
} from './weather-model.ts';

test('weather model detects legacy descriptions', () => {
  assert.equal(detectWeatherKey('Облачно с прояснениями'), 'cloudy');
  assert.equal(detectWeatherKey('Слабый дождь'), 'rain');
  assert.equal(detectWeatherKey(''), 'default');
});

test('weather model builds legacy media urls', () => {
  assert.deepEqual(buildWeatherMedia('day', 'default'), {
    backgroundImageUrl: '/img/weather/newweather/bg/day/default.png',
    videoUrl: null,
  });

  assert.deepEqual(buildWeatherMedia('night', 'snow'), {
    backgroundImageUrl: null,
    videoUrl: '/img/weather/newweather/video/snow-night.mp4',
  });
});

test('weather model maps condition keys to legacy forecast icons', () => {
  assert.equal(getForecastIconKey('clear'), 'sun');
  assert.equal(getForecastIconKey('cloudy'), 'cloud');
  assert.equal(getForecastIconKey('fog'), 'cloud');
  assert.equal(getForecastIconKey('rain'), 'rain');
  assert.equal(getForecastIconKey('snow'), 'snow');
});

test('weather model builds map links and forecast dates', () => {
  const links = buildWeatherMapLinks(55.75, 37.61, true, 'ru');
  assert.match(links.mapUrl, /tile\.openstreetmap\.org/);
  assert.match(links.precipUrl, /openweathermap\.org\/map\/precipitation_new/);
  assert.match(links.yandexWeatherUrl, /yandex\.ru\/pogoda\/ru/);
  assert.equal(getDayOfMonthAfter(1, new Date('2026-07-26T10:00:00Z')), 27);
});
