import { APP_DYNAMIC_ROUTES, APP_ROUTE_PLACEHOLDER } from './app-routes.ts';

/**
 * Ранний скрипт сборки приложения (инлайн в <head>, до запуска Next). Две задачи:
 *
 * 1. Клиентские переходы. Next просит данные маршрута файлами из экспорта
 *    (`/pulse/track/489/__next.pulse.track.$d$id.__PAGE__.txt`, `index.txt`) — для реального id их нет.
 *    Обёртка fetch переписывает такие запросы на заготовку (`/pulse/track/_/…`); адрес остаётся настоящим.
 *
 * 2. Холодный старт/перезагрузка глубокой страницы. Capacitor на неизвестный путь отдаёт корневой
 *    index.html. Скрипт переходит на заготовку с меткой в hash, а заготовка до гидрации возвращает
 *    в адресную строку настоящий путь (history.replaceState) — Next видит нужный адрес.
 *    Красивые/старые адреса (/@login, /$link, /invite/…) разворачиваются здесь же.
 *
 * Самодостаточный ES5-код в строке: в <head> нет модулей. Логика сопоставления повторяет app-routes.ts,
 * их совпадение проверяет app-route-boot.test.mts.
 */
const BOOT_SOURCE = String.raw`(function (ROUTES, PLACEHOLDER) {
  var MARK = '#__app_route=';
  function split(path) {
    return path.split('?')[0].split('#')[0].split('/').filter(function (p) { return p; });
  }
  function parse(pattern) {
    return split(pattern).map(function (part) {
      var m = /^\[\[\.\.\.(.+)\]\]$/.exec(part);
      if (m) return { k: 'oc', n: m[1] };
      m = /^\[(.+)\]$/.exec(part);
      if (m) return { k: 'p', n: m[1] };
      return { k: 's', v: part };
    });
  }
  var PARSED = ROUTES.map(function (r) { return parse(r); });
  function shellOf(segs) {
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].k === 's') out.push(segs[i].v);
      else if (segs[i].k === 'p') out.push(PLACEHOLDER);
    }
    return '/' + out.join('/') + (out.length ? '/' : '');
  }
  // Путь каталога → { shell, isShell, depth } или null.
  function match(parts) {
    for (var r = 0; r < PARSED.length; r++) {
      var segs = PARSED[r], ok = true, isShell = true, depth = 0;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (s.k === 'oc') { if (parts.length > i) isShell = false; depth = parts.length; break; }
        if (parts[i] === undefined) { ok = false; break; }
        if (s.k === 's' && parts[i] !== s.v) { ok = false; break; }
        if (s.k === 'p' && parts[i] !== PLACEHOLDER) isShell = false;
        depth = i + 1;
      }
      var last = segs[segs.length - 1];
      if (ok && (!last || last.k !== 'oc') && parts.length !== segs.length) ok = false;
      if (ok) return { shell: shellOf(segs), isShell: isShell, depth: depth };
    }
    return null;
  }
  function decode(v) { try { return decodeURIComponent(v); } catch (e) { return v; } }
  function alias(path, search) {
    var parts = split(path);
    if (parts.length === 1 && parts[0].charAt(0) === '@' && parts[0].length > 1) return '/profile/' + parts[0].slice(1) + '/';
    var first = parts.length === 1 ? decode(parts[0]) : '';
    if (first.charAt(0) === '$' && first.length > 1) return '/group/' + encodeURIComponent(first.slice(1)) + '/';
    if (parts.length === 3 && parts[0] === 'apps' && parts[1] === 'category') return '/apps/?category=' + parts[2];
    if (parts.length === 2 && parts[0] === 'invite') return '/messages/invite/' + parts[1] + '/';
    if (parts.length === 1 && parts[0] === 'legal') return '/about/legal/' + search;
    if (parts[0] === 'security') return '/settings/' + parts.join('/') + '/' + search;
    return null;
  }

  // 1. Данные маршрута для клиентских переходов.
  function rewrite(url) {
    var u;
    try { u = new URL(url, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    var parts = split(u.pathname);
    var file = parts.length && /\.txt$/.test(parts[parts.length - 1]) ? parts.pop() : '';
    if (!file && !/[?&]_rsc=/.test(u.search)) return null;
    var dir = '/' + parts.join('/') + '/';
    var target = alias(dir, '');
    if (target && target.indexOf('?') === -1) { dir = target; parts = split(dir); }
    var m = match(parts);
    if (!m || m.isShell) return target && target.indexOf('?') === -1 ? dir + file + u.search : null;
    return m.shell + file + u.search;
  }
  var nativeFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
    var next = url ? rewrite(url) : null;
    if (next) {
      input = typeof input === 'string' || input instanceof URL ? next : new Request(next, input);
    }
    return nativeFetch.call(this, input, init);
  };

  // 2. Холодный старт на глубокой странице.
  var hash = location.hash;
  var markAt = hash.indexOf(MARK);
  if (markAt !== -1) {
    // Мы на заготовке: возвращаем настоящий адрес до запуска Next.
    var real = decode(hash.slice(markAt + MARK.length));
    history.replaceState(history.state, '', real);
    return;
  }
  var path = location.pathname;
  var aliased = alias(path, location.search);
  var targetPath = aliased || path;
  var targetUrl = aliased || (path + location.search + location.hash);
  var tparts = split(targetPath);
  var dm = match(tparts);
  if (dm && !dm.isShell) {
    location.replace(dm.shell + MARK + encodeURIComponent(targetUrl));
  } else if (aliased) {
    location.replace(aliased);
  }
})`;

export const APP_ROUTE_BOOT_SCRIPT = `${BOOT_SOURCE}(${JSON.stringify(APP_DYNAMIC_ROUTES.map((route) => route.pattern))}, ${JSON.stringify(APP_ROUTE_PLACEHOLDER)});`;

/** Для тестов: исходник без вызова. */
export const APP_ROUTE_BOOT_SOURCE = BOOT_SOURCE;
