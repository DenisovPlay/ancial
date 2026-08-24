#!/usr/bin/env node
/**
 * Lint-ratchet: падает, только если число ESLint-ошибок ВЫРОСЛО
 * относительно базового значения в lint-ratchet.json.
 *
 * Так CI держит зелёным legacy-код (544 существующие ошибки), но блокирует
 * любой PR, добавляющий новые. Чинить старое можно постепенно — базу
 * уменьшаем вручную: `node scripts/lint-ratchet.mjs --update`.
 *
 * Флаги:
 *   --update   записать текущее количество ошибок как новую базу
 *   --strict   игнорировать базу (использовать в CI после полной зачистки)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = join(root, 'lint-ratchet.json');
const updateMode = process.argv.includes('--update');
const strictMode = process.argv.includes('--strict');

const baseline = strictMode
    ? { maxErrors: 0 }
    : existsSync(baselineFile)
        ? JSON.parse(readFileSync(baselineFile, 'utf8'))
        : { maxErrors: 0 };

process.stdout.write('Запуск eslint...\n');
const res = spawnSync('npx', ['eslint', '--format', 'json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
});

if (res.status !== 0 && !res.stdout) {
    console.error('eslint не смог запуститься:\n', res.stderr?.slice(0, 2000));
    process.exit(2);
}

let results;
try {
    results = JSON.parse(res.stdout);
} catch {
    console.error('Не удалось разобрать вывод eslint');
    process.exit(2);
}

const errors = results.reduce((sum, f) => sum + f.errorCount, 0);
const warnings = results.reduce((sum, f) => sum + f.warningCount, 0);

console.log(`ESLint: ${errors} ошибок, ${warnings} предупреждений (база: ${baseline.maxErrors})`);

if (updateMode) {
    writeFileSync(baselineFile, `${JSON.stringify({ maxErrors: errors }, null, 2)}\n`);
    console.log(`База обновлена: ${errors}. Коммитьте lint-ratchet.json только вместе с реальным уменьшением ошибок.`);
    process.exit(0);
}

if (errors > baseline.maxErrors) {
    console.error(`\n✖ Найдено ${errors - baseline.maxErrors} новых ошибок линтера. CI заблокирован.`);
    console.error('  Исправьте их или обновите базу: node scripts/lint-ratchet.mjs --update (только если ошибки реально устранены).');

    // Показываем топ файлов с новыми ошибками для навигации
    const worst = results
        .filter((f) => f.errorCount > 0)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 10);
    for (const f of worst) {
        const rel = f.filePath.replace(root + '/', '');
        console.error(`  ${String(f.errorCount).padStart(4)}  ${rel}`);
    }
    process.exit(1);
}

console.log(`✔ В пределах базы (${errors}/${baseline.maxErrors}). Новых ошибок нет.`);
