'use client';

import { useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { CommunityPermissionMap, CommunityRole, CommunityStructure } from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';
import { communityChannelTypeLabel } from '../lib/community-presentation';

type ChannelView = 'overview' | 'create_channel' | 'categories' | 'channel_permissions' | 'create_role';
type Props = {
  communityId: number;
  onChanged: () => Promise<void>;
  onOpenView: (view: ChannelView) => void;
  roles: CommunityRole[];
  structure: CommunityStructure;
  view: ChannelView;
};
type PendingDelete = { id: number; kind: 'category' | 'channel' };

export default function CommunityChannelEditor({ communityId, onChanged, onOpenView, roles, structure, view }: Props) {
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
      onOpenView('overview');
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

  const workspaceHeader = (titleText: string) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onOpenView('overview')}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95"
        aria-label={lang?.back || ''}
        title={lang?.back || ''}
      >
        <svg className="size-5 fill-current" viewBox="0 0 48 48" aria-hidden="true"><use href="#IC-chevron-left" /></svg>
      </button>
      <h3 className="text-lg font-semibold text-zinc-100">{titleText}</h3>
    </div>
  );

  const inputClass = 'rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none focus:border-purple-400';
  const selectClass = 'cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100';
  const primaryBtn = 'cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50';

  const overview = (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 grid-cols-3">
        <button type="button" onClick={() => onOpenView('create_channel')} className="cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-600/20 p-3 text-center text-sm font-semibold text-purple-100 duration-300 hover:bg-purple-600/30 active:scale-95">{lang?.community_create_channel}</button>
        <button type="button" onClick={() => onOpenView('categories')} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3 text-center text-sm font-semibold text-zinc-100 duration-300 hover:bg-zinc-700 active:scale-95">{lang?.community_create_category}</button>
        <button type="button" onClick={() => onOpenView('channel_permissions')} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3 text-center text-sm font-semibold text-zinc-100 duration-300 hover:bg-zinc-700 active:scale-95">{lang?.community_channel_permissions}</button>
      </div>
      <div className="flex flex-col gap-3">
        {structure.channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
            <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{channel.title}</span>
            <span className="hidden text-xs text-zinc-500 sm:block">{communityChannelTypeLabel(channel.channel_type, channelTypeLabels)}</span>
            <button type="button" onClick={() => setPendingDelete({ id: channel.id, kind: 'channel' })} className="cursor-pointer rounded-3xl bg-red-600/20 px-3 py-1.5 text-sm text-red-300 duration-300 hover:bg-red-600 hover:text-white active:scale-95">{lang?.delete}</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {view === 'overview' ? overview : null}

      {view === 'create_channel' ? (
        <div className="flex flex-col gap-3">
          {workspaceHeader(lang?.community_create_channel || '')}
          <input aria-label={lang?.community_channel_name} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={lang?.community_channel_name} className={inputClass} />
          <select aria-label={lang?.community_channel_text} value={channelType} onChange={(e) => setChannelType(e.target.value as typeof channelType)} className={selectClass}>
            <option value="text">{lang?.community_channel_text}</option>
            <option value="announcement">{lang?.community_channel_announcement}</option>
            <option value="voice">{lang?.community_channel_voice}</option>
          </select>
          <select aria-label={lang?.community_categories} value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)} className={selectClass}>
            <option value="">{lang?.community_channel_uncategorized}</option>
            {structure.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" disabled={saving || !title.trim()} onClick={() => void createChannel()} className={primaryBtn}>
            {lang?.community_create_channel}
          </button>
        </div>
      ) : null}

      {view === 'categories' ? (
        <div className="flex flex-col gap-3">
          {workspaceHeader(lang?.community_categories || '')}
          <div className="flex gap-1.5">
            <input aria-label={lang?.community_category_name} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder={lang?.community_category_name} className={`min-w-0 flex-1 ${inputClass}`} />
            <button type="button" aria-label={lang?.community_create_category} onClick={() => void createCategory()} className="flex h-[50px] w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-3xl bg-purple-600 text-white duration-300 hover:bg-purple-500 active:scale-95">
              <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48"><use href="#IC-plus" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {structure.categories.map((c) => (
              <button key={c.id} type="button" onClick={() => setPendingDelete({ id: c.id, kind: 'category' })} className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 duration-300 hover:bg-red-500/30 active:scale-95">{c.name} ×</button>
            ))}
          </div>
        </div>
      ) : null}

      {view === 'channel_permissions' ? (
        <div className="flex flex-col gap-3">
          {workspaceHeader(lang?.community_channel_permissions || '')}
          <select aria-label={lang?.community_select_channel} value={overrideDialogId || ''} onChange={(e) => setOverrideDialogId(Number(e.target.value))} className={selectClass}>
            <option value="">{lang?.community_select_channel}</option>
            {structure.channels.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select aria-label={lang?.community_select_role} value={overrideRoleId || ''} onChange={(e) => setOverrideRoleId(Number(e.target.value))} className={selectClass}>
            <option value="">{lang?.community_select_role}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {(['view_channel', 'send_messages'] as const).map((permission) => (
            <div key={permission} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-3xl bg-zinc-800/60 p-3 text-sm text-zinc-300">
              <span>{lang?.[`community_permission_${permission}`]}</span>
              <button type="button" onClick={() => { setOverrideAllow((c) => ({ ...c, [permission]: !c[permission] })); setOverrideDeny((c) => ({ ...c, [permission]: false })); }} className={`cursor-pointer rounded-3xl px-3 py-1 duration-300 active:scale-95 ${overrideAllow[permission] ? 'bg-green-600 text-white' : 'bg-zinc-700'}`}>{lang?.community_allow}</button>
              <button type="button" onClick={() => { setOverrideDeny((c) => ({ ...c, [permission]: !c[permission] })); setOverrideAllow((c) => ({ ...c, [permission]: false })); }} className={`cursor-pointer rounded-3xl px-3 py-1 duration-300 active:scale-95 ${overrideDeny[permission] ? 'bg-red-600 text-white' : 'bg-zinc-700'}`}>{lang?.community_deny}</button>
            </div>
          ))}
          <button type="button" onClick={() => void saveOverride()} disabled={!overrideDialogId || !overrideRoleId} className={primaryBtn}>{lang?.save}</button>
        </div>
      ) : null}

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={lang?.delete || ''}
        description={pendingDelete?.kind === 'category' ? (lang?.community_category_delete_confirm || '') : (lang?.community_channel_delete_confirm || '')}
        confirmLabel={lang?.delete}
        cancelLabel={lang?.cancel}
      />
    </div>
  );
}
