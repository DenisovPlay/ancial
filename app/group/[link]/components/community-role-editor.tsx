'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityPermissionMap, CommunityPermissionName, CommunityRole, CommunityRoleList } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

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

  const roleForm = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3"><button type="button" onClick={closeForm} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-800 duration-300 active:scale-95"><svg className="size-5 fill-current" viewBox="0 0 48 48"><use href="#IC-chevron-left" /></svg></button><h3 className="text-lg font-semibold">{editingRoleId ? lang?.community_edit_role : lang?.community_create_role}</h3></div>
      {!editingRole?.is_system ? <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={lang?.community_role_name} className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 outline-none" /><input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-12 w-full cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-2 sm:w-20" /></div> : <div className="rounded-3xl bg-zinc-800/60 p-3 font-semibold">{editingRole?.name}</div>}
      {PERMISSION_GROUPS.map((group) => <section key={group.key} className="flex flex-col gap-2"><h4 className="text-sm font-semibold text-zinc-400">{lang?.[`community_permission_group_${group.key}`]}</h4><div className="grid gap-2 sm:grid-cols-2">{group.permissions.map((permission) => { const checked = permissions[permission] === true; const disabled = !editingRole?.is_system && roleList.permissions[permission] !== true; return <label key={permission} className={`flex items-center gap-3 rounded-3xl bg-zinc-800/60 p-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><span className="min-w-0 flex-1 text-sm">{lang?.[`community_permission_${permission}`] || permission}</span><span className="relative inline-flex"><input className="sr-only peer" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => setPermissions((current) => ({ ...current, [permission]: event.target.checked }))} /><span className="group peer relative h-6 w-10 rounded-full bg-zinc-800 duration-300 after:absolute after:left-0 after:top-0 after:h-6 after:w-6 after:rounded-full after:bg-red-500 after:duration-300 peer-checked:after:translate-x-4 peer-checked:after:bg-green-500" /></span></label>; })}</div></section>)}
      <button type="button" onClick={() => void saveRole()} disabled={saving || (!editingRole?.is_system && !name.trim())} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold duration-300 active:scale-95 disabled:opacity-50">{editingRoleId ? lang?.community_update_role : lang?.community_create_role}</button>
    </div>
  );

  return <div className="flex flex-col gap-3">
    {view === 'overview' ? <><button type="button" onClick={openCreate} className="cursor-pointer rounded-3xl bg-purple-600/20 p-3 font-semibold text-purple-100 duration-300 active:scale-95">{lang?.community_create_role}</button>{roleList.roles.map((role) => <div key={role.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} /><span className="min-w-0 flex-1 truncate font-semibold">{role.name}</span><span className="text-xs text-zinc-500">{role.member_count}</span><button type="button" onClick={() => openEdit(role)} className="cursor-pointer rounded-3xl bg-zinc-700 px-3 py-1.5 duration-300 active:scale-95">{lang?.edit}</button>{!role.is_system ? <button type="button" onClick={() => setPendingRoleId(role.id)} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-1.5 duration-300 active:scale-95">{lang?.delete}</button> : null}</div>)}</> : null}
    {view === 'create_role' || view === 'edit_role' ? roleForm : null}
    <ConfirmDeleteModal isOpen={pendingRoleId !== null} onClose={() => setPendingRoleId(null)} onConfirm={confirmDeleteRole} title={lang?.delete || ''} description={lang?.community_role_delete_confirm || ''} confirmLabel={lang?.delete} cancelLabel={lang?.cancel} />
  </div>;
}
