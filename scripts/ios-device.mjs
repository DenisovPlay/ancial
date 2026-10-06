#!/usr/bin/env node
/**
 * Сборка iOS-приложения под подключённый iPhone и установка (подпись — Personal Team из Xcode, без платного аккаунта).
 * Нужны: Xcode, вход в Apple ID в Xcode (Settings → Accounts), iPhone по кабелю, включённый «Режим разработчика».
 * Переменные: IOS_TEAM (id команды, по умолчанию берётся из настроек Xcode), IOS_DEVICE (UDID, по умолчанию первый подключённый).
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...options });
const read = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' });

const team = process.env.IOS_TEAM
  || /teamID = (\w+);/.exec(read('defaults', ['read', 'com.apple.dt.Xcode', 'IDEProvisioningTeamByIdentifier']))?.[1];
if (!team) throw new Error('Не найдена команда разработчика: войдите в Apple ID в Xcode или задайте IOS_TEAM');

const devices = read('xcrun', ['devicectl', 'list', 'devices']).split('\n').filter((line) => /connected/.test(line) && /physical/.test(line));
const device = process.env.IOS_DEVICE || /([0-9A-F]{8}-[0-9A-F]{16})/.exec(devices[0] ?? '')?.[1];
if (!device) throw new Error('iPhone не подключён (проверьте кабель, «Доверять» и режим разработчика)');

const derived = '/tmp/zypo-ios';
run('xcodebuild', ['-project', 'App.xcodeproj', '-scheme', 'App', '-configuration', 'Debug', '-destination', 'generic/platform=iOS', '-derivedDataPath', derived, `DEVELOPMENT_TEAM=${team}`, '-allowProvisioningUpdates', '-quiet', 'build'], { cwd: join(root, 'ios/App') });
run('xcrun', ['devicectl', 'device', 'install', 'app', '--device', device, join(derived, 'Build/Products/Debug-iphoneos/App.app')]);
run('xcrun', ['devicectl', 'device', 'process', 'launch', '--device', device, 'cc.zypo.app']);
