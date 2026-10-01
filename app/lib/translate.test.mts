import assert from 'node:assert/strict';
import test from 'node:test';

import { detectTextLanguage } from './translate.ts';

test('язык поста не определяется по адресам картинок в карусели', () => {
  const content = '[carousel]/image.php?file=posts%2Fpost_1_1790884218_cdf4cfb9.webp||/image.php?file=posts%2Fpost_1_1790884225_1810ef0686053df0.webp[/carousel]Про вкусы не спорят, но какой-то странный вайбик у нас получается.';
  assert.equal(detectTextLanguage(content), 'ru');
  assert.equal(detectTextLanguage('[carousel]/image.php?file=posts%2Fabc.webp[/carousel]'), null);
  assert.equal(detectTextLanguage('Hello world, this is an English post'), 'en');
});
