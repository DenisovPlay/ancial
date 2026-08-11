'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityPermissionMap, CommunityRole, CommunityStructure } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';
import { communityChannelTypeLabel } from '../lib/community-presentation';

type Props = { communityId: number; onChanged: () => Promise<void>; roles: CommunityRole[]; structure: CommunityStructure };
type PendingDelete = { id: number; kind: 'category' | 'channel' };

export default function CommunityChannelEditor({ communityId, onChanged, roles, structure }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [title, setTitle] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'announcement' | 'voice'>('text');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [overrideDialogId, setOverrideDialogId] = useState<number>(0);
  const [overrideRoleId, setOverrideRoleId] = useState<number>(0);
  const [overrideAllow, setOverrideAllow] = useState<CommunityPermissionMap>({});
  const [overrideDeny, setOverrideDeny] = useState<CommunityPermissionMap>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const channelTypeLabels = {
    text: lang?.community_channel_text || '',
    announcement: lang?.community_channel_announcement || '',
    voice: lang?.community_channel_voice || '',
  };

  const createChannel = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await AncialAPI.mutateCommunityChannel({ community_id: communityId, action: 'create', title: title.trim(), channel_type: channelType, category_id: categoryId });
      setTitle('');
      await onChanged();
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) {
      console.error('Community channel creation failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await AncialAPI.mutateCommunityCategory({ community_id: communityId, action: 'create', name: categoryName.trim() });
      setCategoryName('');
      await onChanged();
    } catch (error) {
      console.error('Community category creation failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await AncialAPI.mutateCommunityCategory({ community_id: communityId, action: 'delete', category_id: id });
      await onChanged();
    } catch (error) {
      console.error('Community category deletion failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const saveOverride = async () => {
    if (!overrideDialogId || !overrideRoleId) return;
    try {
      await AncialAPI.mutateCommunityChannelOverride({
        community_id: communityId,
        dialog_id: overrideDialogId,
        target_type: 'role',
        target_id: overrideRoleId,
        allow: overrideAllow,
        deny: overrideDeny,
      });
      await onChanged();
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) {
      console.error('Community channel override failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const deleteChannel = async (dialogId: number) => {
    try {
      await AncialAPI.mutateCommunityChannel({ community_id: communityId, action: 'delete', dialog_id: dialogId });
      await onChanged();
    } catch (error) {
      console.error('Community channel deletion failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const confirmDelete = () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
    if (pending.kind === 'category') void deleteCategory(pending.id);
    else void deleteChannel(pending.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-3">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={lang?.community_channel_name} className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none focus:border-purple-400" />
        <select value={channelType} onChange={(event) => setChannelType(event.target.value as typeof channelType)} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100">
          <option value="text">{lang?.community_channel_text}</option>
          <option value="announcement">{lang?.community_channel_announcement}</option>
          <option value="voice">{lang?.community_channel_voice}</option>
        </select>
        <select value={categoryId ?? ''} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100">
          <option value="">{lang?.community_channel_uncategorized}</option>
          {structure.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <button type="button" disabled={saving || !title.trim()} onClick={() => void createChannel()} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50">
          {lang?.community_create_channel}
        </button>
      </div>
      <div className="flex flex-col gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-3">
        <p className="font-semibold text-zinc-100">{lang?.community_categories}</p>
        <div className="flex gap-2">
          <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder={lang?.community_category_name} className="min-w-0 flex-1 rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none" />
          <button type="button" onClick={() => void createCategory()} className="cursor-pointer rounded-3xl bg-purple-600 px-4 text-white duration-300 hover:bg-purple-500 active:scale-95">+</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {structure.categories.map((category) => <button key={category.id} type="button" onClick={() => setPendingDelete({ id: category.id, kind: 'category' })} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 duration-300 hover:bg-red-500/30 active:scale-95">{category.name} ×</button>)}
        </div>
      </div>
      {structure.channels.map((channel) => (
        <div key={channel.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
          <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{channel.title}</span>
          <span className="text-xs text-zinc-500">{communityChannelTypeLabel(channel.channel_type, channelTypeLabels)}</span>
          <button type="button" onClick={() => setPendingDelete({ id: channel.id, kind: 'channel' })} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-1.5 text-sm text-white duration-300 hover:bg-red-500 active:scale-95">{lang?.delete}</button>
        </div>
      ))}
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-3">
        <p className="font-semibold text-zinc-100">{lang?.community_channel_permissions}</p>
        <select value={overrideDialogId || ''} onChange={(event) => setOverrideDialogId(Number(event.target.value))} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100">
          <option value="">{lang?.community_select_channel}</option>
          {structure.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.title}</option>)}
        </select>
        <select value={overrideRoleId || ''} onChange={(event) => setOverrideRoleId(Number(event.target.value))} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100">
          <option value="">{lang?.community_select_role}</option>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
        {(['view_channel', 'send_messages'] as const).map((permission) => (
          <div key={permission} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-3xl bg-zinc-800/60 p-2 text-sm text-zinc-300">
            <span>{lang?.[`community_permission_${permission}`]}</span>
            <button type="button" onClick={() => { setOverrideAllow((current) => ({ ...current, [permission]: !current[permission] })); setOverrideDeny((current) => ({ ...current, [permission]: false })); }} className={`cursor-pointer rounded-3xl px-3 py-1 duration-300 active:scale-95 ${overrideAllow[permission] ? 'bg-green-600 text-white' : 'bg-zinc-700'}`}>{lang?.community_allow}</button>
            <button type="button" onClick={() => { setOverrideDeny((current) => ({ ...current, [permission]: !current[permission] })); setOverrideAllow((current) => ({ ...current, [permission]: false })); }} className={`cursor-pointer rounded-3xl px-3 py-1 duration-300 active:scale-95 ${overrideDeny[permission] ? 'bg-red-600 text-white' : 'bg-zinc-700'}`}>{lang?.community_deny}</button>
          </div>
        ))}
        <button type="button" onClick={() => void saveOverride()} disabled={!overrideDialogId || !overrideRoleId} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50">{lang?.save}</button>
      </div>
      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={lang?.delete || ''}
        description={pendingDelete?.kind === 'category'
          ? (lang?.community_category_delete_confirm || '')
          : (lang?.community_channel_delete_confirm || '')}
        confirmLabel={lang?.delete}
        cancelLabel={lang?.cancel}
      />
    </div>
  );
}
