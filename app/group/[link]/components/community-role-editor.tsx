'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { canManageCommunityRole, type CommunityPermissionMap, type CommunityPermissionName, type CommunityRole, type CommunityRoleList } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';
import { communityRoleLabel } from '../lib/community-presentation';

const PERMISSION_GROUPS: Array<{ key: string; permissions: CommunityPermissionName[] }> = [
  { key: 'management', permissions: ['manage_community', 'manage_channels', 'manage_roles', 'manage_members', 'manage_invites', 'manage_join_requests', 'view_audit_log'] },
  { key: 'content', permissions: ['manage_posts', 'manage_messages'] },
  { key: 'channels', permissions: ['view_channel', 'send_messages', 'add_reactions', 'mention_everyone', 'connect_voice', 'speak_voice', 'manage_voice'] },
];

type RoleView = 'overview' | 'create_channel' | 'edit_channel' | 'categories' | 'channel_permissions' | 'create_role' | 'edit_role';
type Props = { communityId: number; onChanged: () => Promise<void>; onOpenView: (view: RoleView) => void; roleList: CommunityRoleList; view: RoleView };

export default function CommunityRoleEditor({ communityId, onChanged, onOpenView, roleList, view }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#a855f7');
  const [permissions, setPermissions] = useState<CommunityPermissionMap>({ view_channel: true, send_messages: true });
  const [saving, setSaving] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);
  const editingRole = editingRoleId ? roleList.roles.find((role) => role.id === editingRoleId) ?? null : null;
  const primary = 'cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50';
  const roleCreateAction = `${primary} text-xs leading-tight sm:text-sm`;

  const reset = () => { setEditingRoleId(null); setName(''); setColor('#a855f7'); setPermissions({ view_channel: true, send_messages: true }); };
  const openCreate = () => { reset(); onOpenView('create_role'); };
  const openEdit = (role: CommunityRole) => { setEditingRoleId(role.id); setName(role.name); setColor(role.color); setPermissions({ ...role.permissions }); onOpenView('edit_role'); };
  const closeForm = () => { reset(); onOpenView('overview'); };

  const saveRole = async () => {
    if ((!editingRole?.is_system && !name.trim()) || saving) return;
    setSaving(true);
    try {
      await AncialAPI.mutateCommunityRole({
        community_id: communityId,
        action: editingRoleId ? 'update' : 'create',
        role_id: editingRoleId ?? undefined,
        name: editingRole?.is_system ? undefined : name.trim(),
        color: editingRole?.is_system ? undefined : color,
        permissions,
      });
      await onChanged(); closeForm(); showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } finally { setSaving(false); }
  };
  const deleteRole = async (roleId: number) => { try { await AncialAPI.mutateCommunityRole({ community_id: communityId, action: 'delete', role_id: roleId }); await onChanged(); } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } };
  const confirmDeleteRole = () => { const roleId = pendingRoleId; setPendingRoleId(null); if (roleId) void deleteRole(roleId); };
  const moveRole = async (roleId: number, direction: -1 | 1) => {
    const customRoleIds = roleList.roles.filter((role) => !role.is_system).map((role) => role.id);
    const currentIndex = customRoleIds.indexOf(roleId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= customRoleIds.length) return;
    [customRoleIds[currentIndex], customRoleIds[nextIndex]] = [customRoleIds[nextIndex], customRoleIds[currentIndex]];
    try {
      await AncialAPI.mutateCommunityRole({ community_id: communityId, action: 'reorder', role_ids: customRoleIds });
      await onChanged();
    } catch (error) {
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const roleForm = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><button type="button" aria-label={lang?.back || ''} title={lang?.back || ''} onClick={closeForm} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-800 duration-300 active:scale-95"><svg className="size-5 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-chevron-left" /></svg></button><h3 className="text-lg font-semibold">{editingRoleId ? lang?.community_edit_role : lang?.community_create_role}</h3></div>
      {!editingRole?.is_system ? <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]"><input aria-label={lang?.community_role_name || ''} value={name} onChange={(event) => setName(event.target.value)} placeholder={lang?.community_role_name} className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 outline-none focus:border-purple-400" /><label className="relative flex h-12 cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 text-sm text-zinc-300 duration-300 focus-within:border-purple-400"><span>{lang?.community_role_color}</span><span className="flex items-center gap-2"><span className="font-mono text-xs uppercase text-zinc-400">{color}</span><span className="h-7 w-7 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }} /></span><input type="color" aria-label={lang?.community_role_color || ''} title={lang?.community_role_color || ''} value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label></div> : <div className="rounded-3xl bg-zinc-800/60 p-3 font-semibold">{editingRole ? communityRoleLabel(editingRole, lang) : ''}</div>}
      {PERMISSION_GROUPS.map((group) => <section key={group.key} className="flex flex-col gap-2"><h4 className="text-sm font-semibold text-zinc-400">{lang?.[`community_permission_group_${group.key}`]}</h4><div className="grid gap-2 sm:grid-cols-2">{group.permissions.map((permission) => { const checked = permissions[permission] === true; const disabled = !editingRole?.is_system && roleList.permissions[permission] !== true; return <label key={permission} className={`flex items-center gap-3 rounded-3xl bg-zinc-800/60 p-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><span className="min-w-0 flex-1 text-sm">{lang?.[`community_permission_${permission}`] || permission}</span><span className="relative inline-flex"><input className="sr-only peer" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => setPermissions((current) => ({ ...current, [permission]: event.target.checked }))} /><span className="group peer relative h-6 w-10 rounded-full bg-zinc-800 duration-300 after:absolute after:left-0 after:top-0 after:h-6 after:w-6 after:rounded-full after:bg-red-500 after:duration-300 peer-checked:after:translate-x-4 peer-checked:after:bg-green-500" /></span></label>; })}</div></section>)}
      <button type="button" onClick={() => void saveRole()} disabled={saving || (!editingRole?.is_system && !name.trim())} className={primary}>{editingRoleId ? lang?.community_update_role : lang?.community_create_role}</button>
    </div>
  );

  const customRoles = roleList.roles.filter((role) => !role.is_system);

  return <div className="flex flex-col gap-3">
    {view === 'overview' ? <>
      <button type="button" onClick={openCreate} className={roleCreateAction}>{lang?.community_create_role}</button>
      {roleList.roles.map((role) => {
        const manageable = canManageCommunityRole({
          actorIsOwner: roleList.is_owner,
          actorPosition: roleList.highest_role_position,
          roleIsSystem: role.is_system,
          rolePosition: role.position,
        });
        const customIndex = customRoles.findIndex((candidate) => candidate.id === role.id);
        return <div key={role.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
          <span className="min-w-0 flex-1 truncate font-semibold">{communityRoleLabel(role, lang)}</span>
          <span className="text-xs text-zinc-500">{role.member_count}</span>
          {!role.is_system && manageable ? <div className="flex shrink-0 gap-1">
            <button type="button" disabled={customIndex <= 0} aria-label={lang?.community_role_move_up || ''} title={lang?.community_role_move_up || ''} onClick={() => void moveRole(role.id, -1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-zinc-100 duration-300 hover:bg-zinc-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"><svg className="h-5 w-5 rotate-90 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-chevron-left" /></svg></button>
            <button type="button" disabled={customIndex < 0 || customIndex >= customRoles.length - 1} aria-label={lang?.community_role_move_down || ''} title={lang?.community_role_move_down || ''} onClick={() => void moveRole(role.id, 1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-zinc-100 duration-300 hover:bg-zinc-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"><svg className="h-5 w-5 -rotate-90 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-chevron-left" /></svg></button>
          </div> : null}
          {manageable ? <button type="button" aria-label={lang?.edit || ''} title={lang?.edit || ''} onClick={() => openEdit(role)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-700 text-zinc-100 duration-300 hover:bg-zinc-600 active:scale-95"><svg className="h-5 w-5 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-edit" /></svg></button> : null}
          {!role.is_system && manageable ? <button type="button" aria-label={lang?.delete || ''} title={lang?.delete || ''} onClick={() => setPendingRoleId(role.id)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-600/20 text-red-300 duration-300 hover:bg-red-600 hover:text-white active:scale-95"><svg className="h-5 w-5 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-trash" /></svg></button> : null}
        </div>;
      })}
    </> : null}
    {view === 'create_role' || view === 'edit_role' ? roleForm : null}
    <ConfirmDeleteModal isOpen={pendingRoleId !== null} onClose={() => setPendingRoleId(null)} onConfirm={confirmDeleteRole} title={lang?.delete || ''} description={lang?.community_role_delete_confirm || ''} confirmLabel={lang?.delete} cancelLabel={lang?.cancel} />
  </div>;
}
