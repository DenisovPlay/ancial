import assert from 'node:assert/strict';
import test from 'node:test';

import { getShareServiceUrl } from './share-modal-model.ts';

test('getShareServiceUrl matches feed share modal links', () => {
  const url = 'https://ancial.ru/pulse/track/10';

  assert.equal(getShareServiceUrl(url, 'vk'), 'https://vk.com/share.php?url=https%3A%2F%2Fancial.ru%2Fpulse%2Ftrack%2F10');
  assert.equal(getShareServiceUrl(url, 'tg'), 'https://telegram.me/share/url?url=https%3A%2F%2Fancial.ru%2Fpulse%2Ftrack%2F10');
  assert.equal(getShareServiceUrl(url, 'x'), 'http://twitter.com/share?url=https%3A%2F%2Fancial.ru%2Fpulse%2Ftrack%2F10');
});
