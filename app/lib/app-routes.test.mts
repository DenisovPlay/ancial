import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { APP_DYNAMIC_ROUTES, getShellPath, matchAppRoute, resolveAppAlias } from './app-routes.ts';
import { APP_ROUTE_BOOT_SOURCE } from './app-route-boot.ts';

test('dynamic routes map to their shell pages', () => {
  assert.deepEqual(matchAppRoute('/pulse/track/489/'), { isShell: false, params: { id: '489' }, pattern: '/pulse/track/[id]', shellPath: '/pulse/track/_/' });
  assert.equal(matchAppRoute('/pulse/track/_/')?.isShell, true);
  assert.equal(matchAppRoute('/pulse/track/')?.pattern, undefined);
  assert.equal(matchAppRoute('/pulse/track/1/extra/'), null);
  assert.deepEqual(matchAppRoute('/call/group/abc/')?.params, { hash: 'abc' });
  assert.equal(matchAppRoute('/messages/invite/XYZ/')?.pattern, '/messages/invite/[code]');
});

test('optional catch-all is served by its base page', () => {
  assert.deepEqual(matchAppRoute('/messages/'), { isShell: true, params: { hash: [] }, pattern: '/messages/[[...hash]]', shellPath: '/messages/' });
  assert.deepEqual(matchAppRoute('/messages/a%24b/')?.params, { hash: ['a$b'] });
  assert.equal(getShellPath('/pay/[[...order]]'), '/pay/');
});

test('params are url-decoded like Next params on the site', () => {
  assert.deepEqual(matchAppRoute('/pulse/shelf/%D0%BD%D0%BE%D0%B2%D0%BE%D0%B5/')?.params, { key: 'новое' });
  assert.deepEqual(matchAppRoute('/profile/%D0%B8%D0%B2%D0%B0%D0%BD/')?.params, { login: 'иван' });
  // Битая последовательность — как есть, без исключения.
  assert.deepEqual(matchAppRoute('/profile/%E0%A4%A/')?.params, { login: '%E0%A4%A' });
});

test('pretty and legacy site urls resolve to real routes', () => {
  assert.equal(resolveAppAlias('/@durov'), '/profile/durov/');
  assert.equal(resolveAppAlias('/$zypo'), '/group/zypo/');
  assert.equal(resolveAppAlias('/%24zypo/'), '/group/zypo/');
  assert.equal(resolveAppAlias('/invite/abc'), '/messages/invite/abc/');
  assert.equal(resolveAppAlias('/apps/category/Игры'), '/apps/?category=Игры');
  assert.equal(resolveAppAlias('/legal'), '/about/legal/');
  assert.equal(resolveAppAlias('/security/sessions', '?a=1'), '/settings/security/sessions/?a=1');
  assert.equal(resolveAppAlias('/pulse/track/1/'), null);
});

/** Инлайн-скрипт в «браузере» из vm: проверяем переписывание запросов и холодный старт. */
function runBoot(href: string) {
  const replaced: string[] = [];
  const fetched: string[] = [];
  const url = new URL(href);
  const history = { state: null, replaceState: (_s: unknown, _t: string, next: string) => replaced.push(`replaceState:${next}`) };
  const location = {
    hash: url.hash, href: url.href, origin: url.origin, pathname: url.pathname, search: url.search,
    replace: (next: string) => replaced.push(`replace:${next}`),
  };
  const window = { fetch: (input: string) => { fetched.push(input); return Promise.resolve(); } };
  const context = vm.createContext({ history, location, window, URL, Request: class {}, encodeURIComponent, decodeURIComponent });
  vm.runInContext(`${APP_ROUTE_BOOT_SOURCE}(${JSON.stringify(APP_DYNAMIC_ROUTES.map((r) => r.pattern))}, '_')`, context);
  return { fetch: (input: string) => { void window.fetch(input); return fetched[fetched.length - 1]; }, replaced };
}

test('boot script sends cold starts on deep pages to the shell and back', () => {
  assert.deepEqual(runBoot('https://localhost/pulse/track/489/?x=1').replaced, ['replace:/pulse/track/_/#__app_route=%2Fpulse%2Ftrack%2F489%2F%3Fx%3D1']);
  assert.deepEqual(runBoot('https://localhost/pulse/track/_/#__app_route=%2Fpulse%2Ftrack%2F489%2F').replaced, ['replaceState:/pulse/track/489/']);
  assert.deepEqual(runBoot('https://localhost/@durov').replaced, ['replace:/profile/_/#__app_route=%2Fprofile%2Fdurov%2F']);
  assert.deepEqual(runBoot('https://localhost/feed/').replaced, []);
  assert.deepEqual(runBoot('https://localhost/messages/').replaced, []);
});

test('boot script rewrites route data requests to the shell', () => {
  const boot = runBoot('https://localhost/');
  assert.equal(boot.fetch('/pulse/track/489/__next.pulse.track.$d$id.__PAGE__.txt'), '/pulse/track/_/__next.pulse.track.$d$id.__PAGE__.txt');
  assert.equal(boot.fetch('/pulse/track/489/index.txt?_rsc=abc'), '/pulse/track/_/index.txt?_rsc=abc');
  assert.equal(boot.fetch('/messages/abc/index.txt'), '/messages/index.txt');
  assert.equal(boot.fetch('/@someone/index.txt?_rsc=1'), '/profile/_/index.txt?_rsc=1');
  assert.equal(boot.fetch('/feed/index.txt'), '/feed/index.txt');
  assert.equal(boot.fetch('https://backend.ru.zypo.cc/api/V2/pulse/GetTrack.php?id=1'), 'https://backend.ru.zypo.cc/api/V2/pulse/GetTrack.php?id=1');
});

test('boot script and app-routes agree on every route', () => {
  for (const { pattern } of APP_DYNAMIC_ROUTES) {
    const sample = pattern.replace(/\[\[\.\.\.[^\]]+\]\]/, 'x/y').replace(/\[[^\]]+\]/g, 'v1');
    const expected = matchAppRoute(sample);
    assert.ok(expected && !expected.isShell, pattern);
    const boot = runBoot('https://localhost/');
    assert.equal(boot.fetch(`${sample.replace(/\/?$/, '/')}index.txt`), `${expected.shellPath}index.txt`, pattern);
  }
});
