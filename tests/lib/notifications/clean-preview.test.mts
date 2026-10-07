import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanNotificationPreview } from './clean-preview.ts';

test('превью уведомления без картинок и BBCode', () => {
  assert.equal(cleanNotificationPreview('[carousel]/image.php?file=posts%2Fa.webp||/image.php?file=posts%2Fb.webp[/carousel]Про вкусы не спорят.'), 'Про вкусы не спорят.');
  assert.equal(cleanNotificationPreview('/image.php?file=posts%2Fpost_1_1790884218_cdf4cfb9.webp'), null);
  assert.equal(cleanNotificationPreview('[b]Жирный[/b]<br />текст [https://vk.com|vk] https://i.ibb.co/x/y.png конец'), 'Жирный текст vk конец');
  assert.equal(cleanNotificationPreview(''), null);
});
