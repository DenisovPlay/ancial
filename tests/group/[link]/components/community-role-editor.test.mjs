import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./community-role-editor.tsx', import.meta.url), 'utf8');

assert.match(source, /manage_community/, 'role catalog must expose community editing');
assert.doesNotMatch(source, /attach_files/, 'nonexistent file permission must not render');
assert.match(source, /onOpenView\('edit_role'\)/, 'role rows must open edit workspace');
assert.match(source, /action: editingRoleId \? 'update' : 'create'/, 'one form must create and update roles');
assert.match(source, /role\.is_system/, 'system role controls must be restricted');
assert.match(source, /!role\.is_system/, 'system roles must not expose delete');

console.log('community role editor: ok');
