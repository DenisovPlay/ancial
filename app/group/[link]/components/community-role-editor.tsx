'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityPermissionMap, CommunityPermissionName, CommunityRoleList } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

const EDITABLE_PERMISSIONS: CommunityPermissionName[] = [
  'manage_channels', 'manage_roles', 'manage_members', 'manage_messages', 'manage_posts', 'manage_invites',
  'manage_join_requests', 'manage_voice', 'view_channel', 'send_messages', 'attach_files',
  'add_reactions', 'connect_voice', 'speak_voice', 'mention_everyone', 'view_audit_log',
];

type RoleView = 'overview' | 'create_channel' | 'categories' | 'channel_permissions' | 'create_role';
type Props = {
  communityId: number;
  onChanged: () => Promise<void>;
  onOpenView: (view: RoleView) => void;
  roleList: CommunityRoleList;
  view: RoleView;
};

export default function CommunityRoleEditor({ communityId, onChanged, onOpenView, roleList, view }: Props) {
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
      onOpenView('overview');
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
      {view === 'overview' ? (
        <button type="button" onClick={() => onOpenView('create_role')} className="cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-600/20 p-3 text-center text-sm font-semibold text-purple-100 duration-300 hover:bg-purple-600/30 active:scale-95">
          {lang?.community_create_role}
        </button>
      ) : null}

      {view === 'create_role' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onOpenView('overview')} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95" aria-label={lang?.back || ''} title={lang?.back || ''}>
              <svg className="size-5 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-chevron-left" /></svg>
            </button>
            <h3 className="text-lg font-semibold text-zinc-100">{lang?.community_create_role}</h3>
          </div>
          <input aria-label={lang?.community_role_name} value={name} onChange={(e) => setName(e.target.value)} placeholder={lang?.community_role_name} className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none focus:border-purple-400" />
          <div className="grid gap-2 sm:grid-cols-2">
            {EDITABLE_PERMISSIONS.map((permission) => {
              const isOn = permissions[permission] === true;
              return (
                <label key={permission} className="flex cursor-pointer items-center gap-3 rounded-3xl bg-zinc-800/60 p-2 text-sm text-zinc-300">
                  <span className="min-w-0 flex-1 truncate">{lang?.[`community_permission_${permission}`] || permission}</span>
                  <span className="flex h-5 items-center">
                  <span className="relative inline-flex cursor-pointer items-center">
                      <input className="sr-only peer" type="checkbox" checked={isOn} onChange={(e) => setPermissions((c) => ({ ...c, [permission]: e.target.checked }))} />
                      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ${isOn ? 'bg-green-500' : 'bg-zinc-600'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <button type="button" disabled={saving || !name.trim()} onClick={() => void createRole()} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50">
            {lang?.community_create_role}
          </button>
        </div>
      ) : null}

      {view === 'overview' ? (
        roleList.roles.map((role) => (
          <div key={role.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{role.name}</span>
            <span className="text-xs text-zinc-500">{role.member_count}</span>
            {!role.is_system ? (
              <button type="button" onClick={() => setPendingRoleId(role.id)} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-1.5 text-sm text-white duration-300 hover:bg-red-500 active:scale-95">{lang?.delete}</button>
            ) : null}
          </div>
        ))
      ) : null}

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
