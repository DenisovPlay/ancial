'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityPermissionMap, CommunityPermissionName, CommunityRoleList } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

const EDITABLE_PERMISSIONS: CommunityPermissionName[] = [
  'manage_channels', 'manage_roles', 'manage_members', 'manage_messages', 'manage_invites',
  'manage_join_requests', 'manage_voice', 'view_channel', 'send_messages', 'attach_files',
  'add_reactions', 'connect_voice', 'speak_voice', 'mention_everyone', 'view_audit_log',
];

type Props = { communityId: number; onChanged: () => Promise<void>; roleList: CommunityRoleList };

export default function CommunityRoleEditor({ communityId, onChanged, roleList }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<CommunityPermissionMap>({ view_channel: true, send_messages: true });
  const [saving, setSaving] = useState(false);
  const [pendingRoleId, setPendingRoleId] = useState<number | null>(null);

  const createRole = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await AncialAPI.mutateCommunityRole({ community_id: communityId, action: 'create', name: name.trim(), permissions });
      setName('');
      await onChanged();
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) {
      console.error('Community role creation failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (roleId: number) => {
    try {
      await AncialAPI.mutateCommunityRole({ community_id: communityId, action: 'delete', role_id: roleId });
      await onChanged();
    } catch (error) {
      console.error('Community role deletion failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const confirmDeleteRole = () => {
    const roleId = pendingRoleId;
    setPendingRoleId(null);
    if (roleId) void deleteRole(roleId);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={lang?.community_role_name} className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none focus:border-purple-400" />
        <div className="grid gap-2 sm:grid-cols-2">
          {EDITABLE_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex cursor-pointer items-center gap-3 rounded-3xl bg-zinc-800/60 p-2 text-sm text-zinc-300">
              <span className="min-w-0 flex-1 truncate">{lang?.[`community_permission_${permission}`] || permission}</span>
              <span className="flex h-5 items-center">
                <span className="relative inline-flex items-center cursor-pointer">
                  <input className="sr-only peer" type="checkbox" checked={permissions[permission] === true} onChange={(event) => setPermissions((current) => ({ ...current, [permission]: event.target.checked }))} />
                  <span className="group peer bg-zinc-800 rounded-full duration-300 w-10 h-6 after:duration-300 after:bg-red-500 peer-checked:after:bg-green-500 after:rounded-full after:absolute after:h-6 after:w-6 after:top-0 after:left-0 after:flex after:justify-center after:items-center peer-checked:after:translate-x-4 peer-hover:after:scale-105" />
                </span>
              </span>
            </label>
          ))}
        </div>
        <button type="button" disabled={saving || !name.trim()} onClick={() => void createRole()} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50">{lang?.community_create_role}</button>
      </div>
      {roleList.roles.map((role) => (
        <div key={role.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
          <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{role.name}</span>
          <span className="text-xs text-zinc-500">{role.member_count}</span>
          {!role.is_system ? <button type="button" onClick={() => setPendingRoleId(role.id)} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-1.5 text-sm text-white duration-300 hover:bg-red-500 active:scale-95">{lang?.delete}</button> : null}
        </div>
      ))}
      <ConfirmDeleteModal
        isOpen={pendingRoleId !== null}
        onClose={() => setPendingRoleId(null)}
        onConfirm={confirmDeleteRole}
        title={lang?.delete || ''}
        description={lang?.community_role_delete_confirm || ''}
        confirmLabel={lang?.delete}
        cancelLabel={lang?.cancel}
      />
    </div>
  );
}
