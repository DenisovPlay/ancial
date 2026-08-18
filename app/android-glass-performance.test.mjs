import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bootstrapModuleUrl = new URL('./lib/android-glass.ts', import.meta.url);
const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');
const guardSource = readFileSync(new URL('./components/android-glass-profile.tsx', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

const {
  GLASS_MODE_STORAGE_KEY,
  applyGlassProfile,
  readGlassMode,
  isEffectiveFullGlass,
} = await import(bootstrapModuleUrl.href);

function executeProfile(navigatorValue, mode = 'auto') {
  const classes = new Set();
  let additions = 0;
  const documentValue = {
    documentElement: {
      classList: {
        add: (...names) => {
          additions += 1;
          names.forEach((name) => classes.add(name));
        },
        contains: (name) => classes.has(name),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
      },
    },
  };
  applyGlassProfile(mode, navigatorValue, documentValue);
  applyGlassProfile(mode, navigatorValue, documentValue);
  return { additions, classes };
}

const balancedAndroid = executeProfile({
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
  deviceMemory: 8,
  hardwareConcurrency: 8,
});
assert.deepEqual([...balancedAndroid.classes], ['android-glass']);
assert.equal(balancedAndroid.additions, 1);

const liteAndroid = executeProfile({
  userAgent: 'Mozilla/5.0 (Linux; Android 11; Redmi)',
  deviceMemory: 4,
  hardwareConcurrency: 8,
});
assert.deepEqual([...liteAndroid.classes], ['android-glass', 'android-glass-lite']);
assert.equal(liteAndroid.additions, 2);

assert.equal(executeProfile({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8)' }).classes.size, 0);
assert.equal(executeProfile({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }).classes.size, 0);
assert.deepEqual(
  [...executeProfile({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, 'lite').classes],
  ['android-glass', 'android-glass-lite'],
);
assert.equal(
  executeProfile({ userAgent: 'Mozilla/5.0 (Linux; Android 11; Redmi)', deviceMemory: 2 }, 'full').classes.size,
  0,
);
assert.equal(readGlassMode({ getItem: () => 'lite' }), 'lite');
assert.equal(readGlassMode({ getItem: () => 'unexpected' }), 'auto');
assert.equal(GLASS_MODE_STORAGE_KEY, 'zypo_glass_mode');

// ── 'off' mode — работает для любых устройств ──────────────────────────────
const offAndroid = executeProfile(
  { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', deviceMemory: 8, hardwareConcurrency: 8 },
  'off',
);
assert.deepEqual([...offAndroid.classes], ['android-glass-off'], 'off: Android должен получить только android-glass-off');
assert.equal(offAndroid.additions, 1, 'off: ровно один classList.add');

const offIphone = executeProfile(
  { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' },
  'off',
);
assert.deepEqual([...offIphone.classes], ['android-glass-off'], 'off: iPhone тоже получает android-glass-off');

const offDesktop = executeProfile(
  { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  'off',
);
assert.deepEqual([...offDesktop.classes], ['android-glass-off'], 'off: Desktop тоже получает android-glass-off');

assert.equal(readGlassMode({ getItem: () => 'off' }), 'off', 'readGlassMode должен читать off из localStorage');

// Переключение из 'off' обратно в 'auto' снимает android-glass-off
{
  const classes = new Set(['android-glass-off']);
  const documentValue = {
    documentElement: {
      classList: {
        add: (...names) => names.forEach((n) => classes.add(n)),
        contains: (name) => classes.has(name),
        remove: (...names) => names.forEach((n) => classes.delete(n)),
      },
    },
  };
  applyGlassProfile('auto', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, documentValue);
  assert.ok(!classes.has('android-glass-off'), 'переключение из off: android-glass-off должен сняться');
  assert.ok(!classes.has('android-glass'), 'переключение из off: android-glass не должен появиться для Desktop');
}

const hydratedClasses = new Set();
applyGlassProfile(
  'auto',
  {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    deviceMemory: 8,
    hardwareConcurrency: 8,
  },
  {
    documentElement: {
      classList: {
        add: (...names) => names.forEach((name) => hydratedClasses.add(name)),
      },
    },
  },
);
assert.deepEqual([...hydratedClasses], ['android-glass']);

assert.match(layoutSource, /AndroidGlassProfile/);
assert.match(guardSource, /useLayoutEffect/);
assert.match(guardSource, /applyGlassProfile/);
assert.match(cssSource, /html\.android-glass \[class\*="backdrop-blur"\]/);
assert.match(cssSource, /html\.android-glass-lite \[class\*="backdrop-blur"\]/);
assert.match(cssSource, /html\.android-glass \.pulse-player-full-shell/);
// ── isEffectiveFullGlass tests ──────────────────────────────────────────────
assert.equal(isEffectiveFullGlass('full'), true, 'mode full always true');
assert.equal(isEffectiveFullGlass('off'), false, 'mode off always false');
assert.equal(isEffectiveFullGlass('lite'), false, 'mode lite always false');
assert.equal(isEffectiveFullGlass('auto', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }), true, 'auto on iPhone is true');
assert.equal(isEffectiveFullGlass('auto', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }), true, 'auto on Mac is true');
assert.equal(isEffectiveFullGlass('auto', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }), true, 'auto on Windows is true');
assert.equal(isEffectiveFullGlass('auto', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', deviceMemory: 8, hardwareConcurrency: 8 }), true, 'auto on powerful Android is true');
assert.equal(isEffectiveFullGlass('auto', { userAgent: 'Mozilla/5.0 (Linux; Android 11; Redmi)', deviceMemory: 4, hardwareConcurrency: 4 }), false, 'auto on budget Android is false');

console.log('android adaptive glass: ok');

