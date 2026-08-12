'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityMember, CommunityRole } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

type Props = { communityId: number; members: CommunityMember[]; onChanged: () => Promise<void>; roles: CommunityRole[] };
type PendingModeration = { action: 'ban' | 'kick'; userId: number };

export default function CommunityModeration({ communityId, members, onChanged, roles }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [selectedRoles, setSelectedRoles] = useState<Record<number, number>>({});
  const [pendingModeration, setPendingModeration] = useState<PendingModeration | null>(null);
  const [openActionsFor, setOpenActionsFor] = useState<number | null>(null);

  const moderate = async (action: 'mute' | 'unmute' | 'kick' | 'ban', userId: number) => {
    try {
      await AncialAPI.moderateCommunity({ community_id: communityId, action, user_id: userId, ...(action === 'mute' ? { duration_seconds: 3600 } : {}) });
      await onChanged();
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) {
      console.error('Community moderation failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const confirmModeration = () => {
    const pending = pendingModeration;
    setPendingModeration(null);
    if (pending) void moderate(pending.action, pending.userId);
  };

  const changeRole = async (action: 'assign' | 'remove', userId: number, roleId: number) => {
    try {
      await AncialAPI.mutateCommunityMemberRole({ community_id: communityId, user_id: userId, role_id: roleId, action });
      await onChanged();
    } catch (error) {
      console.error('Community member role update failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const assignSelectedRole = (userId: number) => {
    const roleId = selectedRoles[userId];
    if (!roleId) return;
    setOpenActionsFor(null);
    setSelectedRoles((current) => ({ ...current, [userId]: 0 }));
    void changeRole('assign', userId, roleId);
  };

  const startModeration = (action: 'mute' | 'unmute' | 'kick' | 'ban', userId: number) => {
    setOpenActionsFor(null);
    if (action === 'kick' || action === 'ban') {
      setPendingModeration({ action, userId });
      return;
    }
    void moderate(action, userId);
  };

  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-100">{[member.fname, member.lname].filter(Boolean).join(' ') || member.username}</p>
            <p className="truncate text-xs text-zinc-500">{member.roles.map((role) => role.name).join(', ') || (member.is_owner ? lang?.community_owner : lang?.community_member)}</p>
          </div>
          {!member.is_owner ? (
            <Dropdown
              open={openActionsFor === member.id}
              onOpenChange={(isOpen) => setOpenActionsFor(isOpen ? member.id : null)}
              closeOnChildClick={false}
              triggerSize="sm"
              triggerIcon="IC-more"
              triggerAriaLabel={lang?.community_member_actions || ''}
              triggerClassName="h-10 w-10 shrink-0 hover:bg-zinc-700/80"
              position="bottom"
              align="end"
              width="auto"
              menuClassName="z-[70] w-64 max-w-[calc(100vw-3rem)] bg-zinc-900/95 p-1.5"
            >
              <div className="flex flex-col gap-1.5 p-1">
                <span className="px-1 text-xs font-medium text-zinc-500">{lang?.community_add_role}</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedRoles[member.id] ?? ''}
                    onChange={(event) => setSelectedRoles((current) => ({ ...current, [member.id]: Number(event.target.value) }))}
                    aria-label={lang?.community_select_role || ''}
                    className="h-10 min-w-0 flex-1 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none"
                  >
                    <option value="">{lang?.community_select_role}</option>
                    {roles.filter((role) => role.system_key !== 'member' && !member.roles.some((assigned) => assigned.id === role.id)).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedRoles[member.id]}
                    onClick={() => assignSelectedRole(member.id)}
                    aria-label={lang?.community_add_role || ''}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-3xl bg-purple-600 text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 48 48"><use href="#IC-plus" /></svg>
                  </button>
                </div>
              </div>
              {member.roles.map((role) => (
                <DropdownItem
                  key={role.id}
                  onClick={() => {
                    setOpenActionsFor(null);
                    void changeRole('remove', member.id, role.id);
                  }}
                  icon="IC-times"
                  className="text-sm text-zinc-300"
                  iconClassName="h-5 w-5 fill-zinc-400"
                >
                  {lang?.community_remove_role}: {role.name}
                </DropdownItem>
              ))}
              <div className="my-0.5 h-px bg-zinc-700/60" />
              <DropdownItem
                onClick={() => startModeration(member.is_muted ? 'unmute' : 'mute', member.id)}
                icon="IC-clock"
                className="text-sm text-amber-300"
                iconClassName="h-5 w-5 fill-amber-300"
              >
                {member.is_muted ? lang?.community_unmute : lang?.community_mute}
              </DropdownItem>
              <DropdownItem
                onClick={() => startModeration('kick', member.id)}
                icon="IC-exit"
                className="text-sm text-red-300"
                iconClassName="h-5 w-5 fill-red-300"
              >
                {lang?.community_kick}
              </DropdownItem>
              <DropdownItem
                onClick={() => startModeration('ban', member.id)}
                icon="IC-lock"
                className="text-sm text-red-400 hover:bg-red-500/15"
                iconClassName="h-5 w-5 fill-red-400"
              >
                {lang?.community_ban}
              </DropdownItem>
            </Dropdown>
          ) : null}
        </div>
      ))}
      <ConfirmDeleteModal
        isOpen={pendingModeration !== null}
        onClose={() => setPendingModeration(null)}
        onConfirm={confirmModeration}
        title={pendingModeration?.action === 'ban'
          ? (lang?.community_ban || '')
          : (lang?.community_kick || '')}
        description={lang?.community_moderation_confirm || ''}
        confirmLabel={pendingModeration?.action === 'ban'
          ? lang?.community_ban
          : lang?.community_kick}
        cancelLabel={lang?.cancel}
      />
    </div>
  );
}
