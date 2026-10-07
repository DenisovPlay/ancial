#!/usr/bin/env node
/**
 * Сборка файлов для релиза на GitHub (https://github.com/DenisovPlay/ancial/releases): APK и/или IPA.
 * Версия — только из package.json ("version", например 3.9.5b). Тег релиза на GitHub должен совпадать с ней
 * (3.9.5b или v3.9.5b): по тегу приложение и страница /app/mobile находят самую новую версию.
 *
 *   node scripts/release-build.mjs android|ios|all [--skip-web]
 *   npm run release:android | release:ios | release:all
 *
 * Результат — release/Zypo-<версия>.apk и release/Zypo-<версия>.ipa. IPA собирается БЕЗ подписи: пользователь подписывает
 * своим сертификатом (AltStore/Sideloadly/…), TrollStore ставит как есть. Android подписывается android/keystore.properties
 * (без него release получается неподписанным — скрипт предупредит).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'release');
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...options });

const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const match = /^(\d+)\.(\d+)\.(\d+)([a-z]?)$/i.exec(version);
if (!match) throw new Error(`Версия «${version}» должна быть вида 3.9.5 или 3.9.5b`);
const [, major, minor, patch, letter] = match;
const letterIndex = letter ? letter.toLowerCase().charCodeAt(0) - 96 : 0;
// Как appVersionCode в android/app/build.gradle: 3.8.2b → 308022.
const buildNumber = Number(major) * 100000 + Number(minor) * 1000 + Number(patch) * 10 + letterIndex;
// iOS CFBundleShortVersionString — только числа (буква хотфикса уходит в номер сборки).
const marketingVersion = `${major}.${minor}.${patch}`;

const target = process.argv[2];
const skipWeb = process.argv.includes('--skip-web');
if (!['android', 'ios', 'all'].includes(target)) {
  console.error('Использование: node scripts/release-build.mjs android|ios|all [--skip-web]');
  process.exit(1);
}

const buildWeb = () => {
  if (!skipWeb) run('npm', ['run', 'build:app']);
};

function buildAndroid() {
  buildWeb();
  run('npx', ['cap', 'sync', 'android'], { env: { ...process.env, CAP_ANDROID_RELEASE: '1' } });
  run('./gradlew', ['assembleRelease'], { cwd: join(root, 'android') });
  const signed = existsSync(join(root, 'android', 'keystore.properties'));
  const dir = join(root, 'android/app/build/outputs/apk/release');
  const apk = [join(dir, 'app-release.apk'), join(dir, 'app-release-unsigned.apk')].find(existsSync);
  if (!apk) throw new Error('APK не найден в android/app/build/outputs/apk/release');
  const result = join(outDir, `Zypo-${version}.apk`);
  cpSync(apk, result);
  if (!signed) console.warn('⚠ android/keystore.properties не найден: APK неподписанный, установить его нельзя.');
  return result;
}

function buildIos() {
  buildWeb();
  run('npx', ['cap', 'sync', 'ios']);
  const derived = '/tmp/zypo-ios-release';
  run('xcodebuild', [
    '-project', 'App.xcodeproj', '-scheme', 'App', '-configuration', 'Release', '-destination', 'generic/platform=iOS',
    '-derivedDataPath', derived, '-quiet',
    'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'CODE_SIGN_IDENTITY=',
    `MARKETING_VERSION=${marketingVersion}`, `CURRENT_PROJECT_VERSION=${buildNumber}`,
    'build',
  ], { cwd: join(root, 'ios/App') });
  const app = join(derived, 'Build/Products/Release-iphoneos/App.app');
  if (!existsSync(app)) throw new Error(`Не найден ${app}`);
  const staging = '/tmp/zypo-ipa';
  rmSync(staging, { force: true, recursive: true });
  mkdirSync(join(staging, 'Payload'), { recursive: true });
  cpSync(app, join(staging, 'Payload/App.app'), { recursive: true });
  const result = join(outDir, `Zypo-${version}.ipa`);
  rmSync(result, { force: true });
  execFileSync('zip', ['-qry', result, 'Payload'], { cwd: staging, stdio: 'inherit' });
  return result;
}

mkdirSync(outDir, { recursive: true });
const built = [];
if (target === 'android' || target === 'all') built.push(buildAndroid());
if (target === 'ios' || target === 'all') built.push(buildIos());
console.log(`\nГотово (версия ${version}):\n${built.map((file) => `  ${file}`).join('\n')}`);
console.log(`\nДальше: создайте релиз на GitHub с тегом ${version} и приложите файлы (gh release create ${version} ${built.join(' ')} --title ${version}).`);
