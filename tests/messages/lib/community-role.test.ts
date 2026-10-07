import assert from 'node:assert/strict';
import {
  getCommunityRoleBadgeStyle,
  getCommunityRoleLabel,
  type CommunityDisplayRole,
} from './community-role.ts';

const localized = {
  community_owner: 'Владелец',
  role_admin: 'Администратор',
  role_editor: 'Редактор',
};

const role = (
  systemKey: CommunityDisplayRole['system_key'],
  name = 'Кастомная роль',
  color = '#22c55e',
): CommunityDisplayRole => ({
  id: 7,
  name,
  color,
  position: 10,
  system_key: systemKey,
  is_owner: systemKey === 'owner',
});

assert.equal(getCommunityRoleLabel(role('owner'), localized), 'Владелец');
assert.equal(getCommunityRoleLabel(role('administrator'), localized), 'Администратор');
assert.equal(getCommunityRoleLabel(role('editor'), localized), 'Редактор');
assert.equal(getCommunityRoleLabel(role(null, 'Модератор'), localized), 'Модератор');
assert.equal(getCommunityRoleLabel(role('member'), localized), null);

assert.deepEqual(getCommunityRoleBadgeStyle(role(null)), {
  color: '#22c55e',
  backgroundColor: '#22c55e26',
  borderColor: '#22c55e4d',
});
assert.deepEqual(getCommunityRoleBadgeStyle(role(null, 'Опасная', 'red;display:none')), {
  color: '#a855f7',
  backgroundColor: '#a855f726',
  borderColor: '#a855f74d',
});

console.log('community role badge: ok');
