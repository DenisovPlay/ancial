'use client';

import { useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityMember, CommunityRole } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

type Props = { communityId: number; members: CommunityMember[]; onChanged: () => Promise<void>; roles: CommunityRole[] };

export default function CommunityModeration({ communityId, members, onChanged, roles }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [selectedRoles, setSelectedRoles] = useState<Record<number, number>>({});

  const moderate = async (action: 'mute' | 'unmute' | 'kick' | 'ban', userId: number) => {
    if ((action === 'kick' || action === 'ban') && !window.confirm(lang?.community_moderation_confirm || '')) return;
    try {
      await AncialAPI.moderateCommunity({ community_id: communityId, action, user_id: userId, ...(action === 'mute' ? { duration_seconds: 3600 } : {}) });
      await onChanged();
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) {
      console.error('Community moderation failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
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

  return (
    <div className="flex flex-col gap-3">
      {members.map((member) => (
        <div key={member.id} className="flex flex-col gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-100">{[member.fname, member.lname].filter(Boolean).join(' ') || member.username}</p>
            <p className="truncate text-xs text-zinc-500">{member.roles.map((role) => role.name).join(', ') || (member.is_owner ? lang?.community_owner : lang?.community_member)}</p>
          </div>
          {!member.is_owner ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {member.roles.map((role) => (
                <button key={role.id} type="button" onClick={() => void changeRole('remove', member.id, role.id)} className="cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-500/20 px-2 py-1 text-xs text-purple-200 duration-300 hover:bg-red-500/30 active:scale-95">{role.name} ×</button>
              ))}
              <select value={selectedRoles[member.id] ?? ''} onChange={(event) => setSelectedRoles((current) => ({ ...current, [member.id]: Number(event.target.value) }))} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200">
                <option value="">{lang?.community_add_role}</option>
                {roles.filter((role) => role.system_key !== 'member' && !member.roles.some((assigned) => assigned.id === role.id)).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              {selectedRoles[member.id] ? <button type="button" onClick={() => void changeRole('assign', member.id, selectedRoles[member.id])} className="cursor-pointer rounded-3xl bg-purple-600 px-3 py-1.5 text-xs text-white duration-300 hover:bg-purple-500 active:scale-95">{lang?.add}</button> : null}
              <button type="button" onClick={() => void moderate(member.is_muted ? 'unmute' : 'mute', member.id)} className="cursor-pointer rounded-3xl bg-amber-600 px-3 py-1.5 text-xs text-white duration-300 hover:bg-amber-500 active:scale-95">{member.is_muted ? lang?.community_unmute : lang?.community_mute}</button>
              <button type="button" onClick={() => void moderate('kick', member.id)} className="cursor-pointer rounded-3xl bg-zinc-700 px-3 py-1.5 text-xs text-white duration-300 hover:bg-zinc-600 active:scale-95">{lang?.community_kick}</button>
              <button type="button" onClick={() => void moderate('ban', member.id)} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-1.5 text-xs text-white duration-300 hover:bg-red-500 active:scale-95">{lang?.community_ban}</button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
