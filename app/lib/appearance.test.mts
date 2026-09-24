import test from 'node:test';
import assert from 'node:assert/strict';

const { applyAppearance, DEFAULT_APPEARANCE } = await import('./appearance.ts');

const DESKTOP = { userAgent: 'Mozilla/5.0 (Macintosh)', deviceMemory: 8, hardwareConcurrency: 8 };
const ANDROID = { userAgent: 'Mozilla/5.0 (Linux; Android 14)', deviceMemory: 8, hardwareConcurrency: 8 };
const WEAK_ANDROID = { userAgent: 'Mozilla/5.0 (Linux; Android 11)', deviceMemory: 2, hardwareConcurrency: 4 };

test('по умолчанию на ПК — полное стекло как в дизайне и отзывчивые эффекты', () => {
  const r = applyAppearance(DEFAULT_APPEARANCE, false, DESKTOP);
  assert.equal(r.preset, 'full');
  assert.deepEqual(r.factors.nav, { blur: 1, sat: 1, clarity: 1 });
  assert.deepEqual(r.motion, { nav: true, menu: true, tooltips: 'smooth', lyrics: 'words', expand: true });
});

test('«Авто» на Android — облегчённое стекло без отзывчивых эффектов; на слабом — ещё легче', () => {
  const r = applyAppearance(DEFAULT_APPEARANCE, false, ANDROID);
  assert.equal(r.preset, 'lite');
  assert.equal(r.global.blur, 0.33);
  assert.equal(r.motion.nav, false);
  assert.equal(r.motion.menu, false);
  // Раскрытие на Android остаётся: это дешёвая анимация высоты.
  assert.equal(r.motion.expand, true);
  assert.equal(applyAppearance(DEFAULT_APPEARANCE, false, WEAK_ANDROID).global.blur, 0.17);
  // Явное «включено» пересиливает Android.
  assert.equal(applyAppearance({ motion: { nav: 'on' } }, false, ANDROID).motion.nav, true);
});

test('«Выкл»: без размытия, подложки полностью непрозрачные, затемнение остаётся затемнением', () => {
  const r = applyAppearance({ glass: { preset: 'off' } }, false, DESKTOP);
  assert.deepEqual(r.factors.menu, { blur: 0, sat: 0, clarity: 0 });
  assert.deepEqual(r.global, { blur: 0, clarity: 0, saturate: 0 });
  assert.equal(r.factors.overlay.clarity, 0.75);
  // «Свой», начатый из «Выкл», — те же нули, и ползунок сразу меняет вид.
  const custom = applyAppearance({ glass: { preset: 'custom', blur: 0, clarity: 0.4, saturate: 0 } }, false, DESKTOP);
  assert.equal(custom.factors.panel.clarity, 0.4);
  assert.equal(custom.factors.overlay.clarity, 0.75);
});

test('«Свой»: общие множители × уровень роли, выключенная роль, ограничение 0–2', () => {
  const r = applyAppearance({
    glass: { preset: 'custom', blur: 1.5, clarity: 0.5, saturate: 5, roles: { nav: { on: true, level: 2 }, input: { on: false } } },
  }, false, DESKTOP);
  assert.deepEqual(r.global, { blur: 1.5, clarity: 0.5, saturate: 2 });
  assert.deepEqual(r.factors.nav, { blur: 3, sat: 4, clarity: 0.5 });
  assert.deepEqual(r.factors.panel, { blur: 1.5, sat: 2, clarity: 0.5 });
  assert.deepEqual(r.factors.input, { blur: 0, sat: 0, clarity: 0 });
  // Настройки ролей действуют только в «Своём».
  assert.equal(applyAppearance({ glass: { preset: 'full', roles: { nav: { on: false } } } }, false, DESKTOP).factors.nav.blur, 1);
});

test('reduced motion и мусор в настройках', () => {
  const r = applyAppearance({ motion: { tooltips: 'weird', lyrics: 'lines' } }, false, { ...DESKTOP, reducedMotion: true });
  assert.equal(r.motion.nav, false);
  assert.equal(r.motion.tooltips, 'instant');
  assert.equal(r.motion.lyrics, 'lines');
  assert.equal(r.motion.expand, false);
  assert.equal(applyAppearance({ glass: { preset: 'bogus' } }, false, DESKTOP).preset, 'full');
});

test('функция самодостаточна: работает из toString(), как в inline-скрипте', () => {
  const fn = new Function(`return (${applyAppearance.toString()})`)();
  assert.equal(fn({ glass: { preset: 'off' } }, false, DESKTOP).preset, 'off');
});

test('подключение: скрипт в <head>, синхронизация и никаких старых костылей стекла', async () => {
  const { readFileSync } = await import('node:fs');
  const layout = readFileSync(new URL('../layout.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');
  assert.match(layout, /APPEARANCE_BOOT_SCRIPT/);
  assert.match(layout, /<AppearanceSync \/>/);
  assert.doesNotMatch(css, /android-glass|!important[^;]*backdrop/);
  for (const role of ['nav', 'menu', 'tooltip', 'input', 'panel', 'overlay']) {
    assert.match(css, new RegExp(`@utility glass-${role} \\{`));
  }
});
