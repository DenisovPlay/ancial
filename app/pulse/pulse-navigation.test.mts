import assert from 'node:assert/strict';
import test from 'node:test';

import { getPulseNavigationTarget } from './pulse-navigation.ts';

test('playlist pulse paths stay inside the React app', () => {
  assert.deepEqual(getPulseNavigationTarget('/pulse/playlist/93'), {
    href: '/pulse/playlist/93',
    type: 'internal',
  });

  assert.deepEqual(getPulseNavigationTarget('/pulse/playlist/-1'), {
    href: '/pulse/playlist/-1',
    type: 'internal',
  });
});

test('legacy pulse paths still point to ancial.ru until they are ported', () => {
  assert.deepEqual(getPulseNavigationTarget('/pulse/search?q=test'), {
    href: 'https://ancial.ru/pulse/search?q=test',
    type: 'external',
  });

  assert.deepEqual(getPulseNavigationTarget('/pulse/artist/1'), {
    href: 'https://ancial.ru/pulse/artist/1',
    type: 'external',
  });
});
