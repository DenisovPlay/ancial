#!/usr/bin/env node
/**
 * Сборка приложения (Capacitor): статический экспорт Next в out/.
 *
 * `proxy.ts` (проброс IP клиента на бэкенд) статический экспорт не поддерживает, а приложению он
 * не нужен: на время сборки файл убирается и возвращается в finally — при ошибке и Ctrl+C тоже.
 * Сайт этот скрипт не затрагивает: `npm run build` работает как прежде.
 */
import { spawn } from 'node:child_process';
import { existsSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const proxyFile = join(root, 'proxy.ts');
const proxyBackup = join(root, 'proxy.ts.app-build');

// Прошлая сборка упала жёстко (kill -9) и не вернула файл — возвращаем перед стартом.
if (!existsSync(proxyFile) && existsSync(proxyBackup)) renameSync(proxyBackup, proxyFile);

let moved = false;
function restore() {
  if (moved && existsSync(proxyBackup)) {
    renameSync(proxyBackup, proxyFile);
    moved = false;
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restore();
    process.exit(130);
  });
}

async function run() {
  if (existsSync(proxyFile)) {
    renameSync(proxyFile, proxyBackup);
    moved = true;
  }
  // Экспорт пишет в out/ — прошлый результат не должен подмешиваться.
  rmSync(join(root, 'out'), { force: true, recursive: true });

  const nextBin = join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: root,
      env: { ...process.env, NEXT_PUBLIC_BUILD_TARGET: 'app' },
      stdio: 'inherit',
    });
    child.on('close', (exitCode) => resolve(exitCode ?? 1));
  });
  return code;
}

let exitCode = 1;
try {
  exitCode = await run();
} finally {
  restore();
}
process.exit(exitCode);
