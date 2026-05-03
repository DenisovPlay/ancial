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

test('ported pulse library and artist paths stay inside the React app', () => {
  assert.deepEqual(getPulseNavigationTarget('/pulse/my'), {
    href: '/pulse/my',
    type: 'internal',
  });
  assert.deepEqual(getPulseNavigationTarget('/pulse/library'), {
    href: '/pulse/library',
    type: 'internal',
  });
  assert.deepEqual(getPulseNavigationTarget('/pulse/artist/1'), {
    href: '/pulse/artist/1',
    type: 'internal',
  });
  assert.deepEqual(getPulseNavigationTarget('/pulse/search?q=test'), {
    href: '/pulse/search?q=test',
    type: 'internal',
  });
  assert.deepEqual(getPulseNavigationTarget('/pulse/track/5'), {
    href: '/pulse/track/5',
    type: 'internal',
  });
});

test('legacy pulse paths still point to ancial.ru until they are ported', () => {
  assert.deepEqual(getPulseNavigationTarget('/pulse/legacy?q=test'), {
    href: 'https://ancial.ru/pulse/legacy?q=test',
    type: 'external',
  });
});
