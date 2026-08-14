import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const channelSource = readFileSync(new URL('./community-channel-editor.tsx', import.meta.url), 'utf8');
const roleSource = readFileSync(new URL('./community-role-editor.tsx', import.meta.url), 'utf8');
const ruLocale = readFileSync(new URL('../../../locales/ru.ts', import.meta.url), 'utf8');
const enLocale = readFileSync(new URL('../../../locales/en.ts', import.meta.url), 'utf8');

assert.match(channelSource, /grid grid-cols-3 gap-2 sm:gap-3/);
assert.match(channelSource, /<use href="#IC-edit"/);
assert.match(channelSource, /<use href="#IC-trash"/);
assert.match(channelSource, /placeholder=\{lang\?\.community_category_name\}/);
assert.match(channelSource, /disabled=\{!categoryName\.trim\(\)\}/);
assert.match(channelSource, /<use href="#IC-plus"/);
assert.match(channelSource, /<select aria-label=\{lang\?\.community_select_channel/);
assert.match(channelSource, /<select aria-label=\{lang\?\.community_select_role/);

assert.match(roleSource, /const roleCreateAction = `\$\{primary\} text-xs leading-tight sm:text-sm`/);
assert.match(roleSource, /<button type="button" aria-label=\{lang\?\.back/);
assert.match(roleSource, /onClick=\{openCreate\} className=\{roleCreateAction\}/);
assert.match(roleSource, /aria-label=\{lang\?\.edit \|\| ''\} title=\{lang\?\.edit \|\| ''\} onClick=\{\(\) => openEdit\(role\)\}/);
assert.match(roleSource, /<use href="#IC-edit"/);
assert.match(roleSource, /aria-label=\{lang\?\.delete \|\| ''\} title=\{lang\?\.delete \|\| ''\} onClick=\{\(\) => setPendingRoleId\(role\.id\)\}/);
assert.match(roleSource, /<use href="#IC-trash"/);
assert.match(roleSource, /<input aria-label=\{lang\?\.community_role_name/);
assert.match(roleSource, /lang\?\.community_role_color/);
assert.match(roleSource, /focus-within:border-purple-400/);
assert.match(roleSource, /style=\{\{ backgroundColor: color \}\}/);

assert.match(ruLocale, /"community_category_name": "Название категории"/);
assert.match(ruLocale, /"community_role_color": "Цвет роли"/);
assert.match(enLocale, /"community_category_name": "Category name"/);
assert.match(enLocale, /"community_role_color": "Role color"/);

console.log('community management controls: ok');
