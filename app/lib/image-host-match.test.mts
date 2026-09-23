import test from 'node:test';
import assert from 'node:assert/strict';

const { matchImageHost, isPrivateMediaSrc } = await import('./image-host-match.ts');

const HOSTS = [
  { hostname: '*.ibb.co', insecure: true },
  { hostname: 'avatars.yandex.net' },
];

test('локальные пути оптимизируются, svg/data/blob — нет', () => {
  assert.equal(matchImageHost('/image.php?file=avatars%2Fa.webp', HOSTS), true);
  assert.equal(matchImageHost('/img/placeholders/user.png', HOSTS), true);
  assert.equal(matchImageHost('/img/branding/pulse.svg', HOSTS), false);
  assert.equal(matchImageHost('data:image/gif;base64,R0lGOD', HOSTS), false);
  assert.equal(matchImageHost('blob:http://localhost/abc', HOSTS), false);
  assert.equal(matchImageHost('', HOSTS), false);
});

test('белый список хостов как у remotePatterns', () => {
  assert.equal(matchImageHost('https://i.ibb.co/x/a.png', HOSTS), true);
  assert.equal(matchImageHost('http://i.ibb.co/x/a.png', HOSTS), true, 'insecure разрешает http');
  assert.equal(matchImageHost('//i.ibb.co/x/a.png', HOSTS), true, 'протокол-относительная ссылка');
  assert.equal(matchImageHost('https://a.b.ibb.co/x.png', HOSTS), false, '*. — ровно один уровень');
  assert.equal(matchImageHost('https://ibb.co.evil.com/x.png', HOSTS), false);
  assert.equal(matchImageHost('https://avatars.yandex.net/get/1', HOSTS), true);
  assert.equal(matchImageHost('http://avatars.yandex.net/get/1', HOSTS), false, 'без insecure http нельзя');
  assert.equal(matchImageHost('https://unknown.example/a.png', HOSTS), false);
});

test('optimize: false — хост из контента, но мимо оптимизатора', () => {
  const hosts = [{ hostname: '*.ibb.co', insecure: true, optimize: false as const }];
  assert.equal(matchImageHost('https://i.ibb.co/x/a.png', hosts), false);
});

test('приватные медиа (нужна сессия) — мимо оптимизатора', () => {
  assert.equal(isPrivateMediaSrc('/api/V2/media/Image.php?id=2886'), true);
  assert.equal(isPrivateMediaSrc('https://zypo.cc/api/V2/media/Image.php?id=1'), true);
  assert.equal(isPrivateMediaSrc('/image.php?id=15'), true);
  assert.equal(isPrivateMediaSrc('/image.php?file=avatars%2Fa.webp'), false, 'публичный file= оптимизируется');
  assert.equal(isPrivateMediaSrc('/img/placeholders/user.png'), false);
});
