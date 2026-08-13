'use client';

import { useEffect, useMemo, useState } from 'react';

import ConfirmDeleteModal from '../../../components/confirm-delete-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import {
  COMMUNITY_CHANNEL_PERMISSION_NAMES,
  type CommunityChannel,
  type CommunityPermissionMap,
  type CommunityPermissionName,
  type CommunityRole,
  type CommunityStructure,
} from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';

type ChannelView = 'overview' | 'create_channel' | 'edit_channel' | 'categories' | 'channel_permissions' | 'create_role' | 'edit_role';
type OverrideValue = 'inherit' | 'allow' | 'deny';
type Props = { communityId: number; onChanged: () => Promise<void>; onOpenView: (view: ChannelView) => void; roles: CommunityRole[]; structure: CommunityStructure; view: ChannelView };
type PendingDelete = { id: number; kind: 'category' | 'channel' };

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
      <span className="text-sm text-zinc-200">{label}</span>
      <span className="relative inline-flex items-center">
        <input className="sr-only peer" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="group peer relative h-6 w-10 rounded-full bg-zinc-800 duration-300 after:absolute after:left-0 after:top-0 after:flex after:h-6 after:w-6 after:items-center after:justify-center after:rounded-full after:bg-red-500 after:duration-300 peer-checked:after:translate-x-4 peer-checked:after:bg-green-500 peer-hover:after:scale-105" />
      </span>
    </label>
  );
}

export default function CommunityChannelEditor({ communityId, onChanged, onOpenView, roles, structure, view }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [slowMode, setSlowMode] = useState(0);
  const [editingId, setEditingId] = useState(0);
  const [categoryName, setCategoryName] = useState('');
  const [overrideDialogId, setOverrideDialogId] = useState(0);
  const [overrideRoleId, setOverrideRoleId] = useState(0);
  const [overrideValues, setOverrideValues] = useState<Partial<Record<CommunityPermissionName, OverrideValue>>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const selectedRoleOverride = useMemo(() => ({ dialogId: overrideDialogId, roleId: overrideRoleId }), [overrideDialogId, overrideRoleId]);
  useEffect(() => {
    if (!selectedRoleOverride.dialogId || !selectedRoleOverride.roleId) {
      setOverrideValues({});
      return;
    }
    let active = true;
    void AncialAPI.communityChannelOverrides(communityId, selectedRoleOverride.dialogId).then(({ overrides }) => {
      if (!active) return;
      const current = overrides.find((entry) => entry.target_type === 'role' && entry.target_id === selectedRoleOverride.roleId);
      const values: Partial<Record<CommunityPermissionName, OverrideValue>> = {};
      for (const permission of COMMUNITY_CHANNEL_PERMISSION_NAMES) {
        values[permission] = current?.deny[permission] ? 'deny' : current?.allow[permission] ? 'allow' : 'inherit';
      }
      setOverrideValues(values);
    }).catch(() => { if (active) setOverrideValues({}); });
    return () => { active = false; };
  }, [communityId, selectedRoleOverride]);

  const resetChannel = () => { setTitle(''); setCategoryId(null); setVoiceEnabled(true); setReadOnly(false); setSlowMode(0); setEditingId(0); };
  const openEdit = (channel: CommunityChannel) => {
    setEditingId(channel.id); setTitle(channel.title); setCategoryId(channel.category_id); setVoiceEnabled(channel.voice_enabled); setReadOnly(channel.read_only); setSlowMode(channel.slow_mode_seconds); onOpenView('edit_channel');
  };
  const saveChannel = async (action: 'create' | 'update') => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await AncialAPI.mutateCommunityChannel({ community_id: communityId, action, dialog_id: action === 'update' ? editingId : undefined, title: title.trim(), channel_type: 'text', category_id: categoryId, voice_enabled: voiceEnabled, read_only: readOnly, slow_mode_seconds: slowMode });
      resetChannel(); await onChanged(); onOpenView('overview'); showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
    } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } finally { setSaving(false); }
  };
  const createCategory = async () => { if (!categoryName.trim()) return; try { await AncialAPI.mutateCommunityCategory({ community_id: communityId, action: 'create', name: categoryName.trim() }); setCategoryName(''); await onChanged(); } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } };
  const deleteCategory = async (id: number) => { try { await AncialAPI.mutateCommunityCategory({ community_id: communityId, action: 'delete', category_id: id }); await onChanged(); } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } };
  const deleteChannel = async (dialogId: number) => { try { await AncialAPI.mutateCommunityChannel({ community_id: communityId, action: 'delete', dialog_id: dialogId }); await onChanged(); } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); } };
  const saveOverride = async () => {
    if (!overrideDialogId || !overrideRoleId) return;
    const allow: CommunityPermissionMap = {}; const deny: CommunityPermissionMap = {};
    for (const permission of COMMUNITY_CHANNEL_PERMISSION_NAMES) { if (overrideValues[permission] === 'allow') allow[permission] = true; if (overrideValues[permission] === 'deny') deny[permission] = true; }
    try { await AncialAPI.mutateCommunityChannelOverride({ community_id: communityId, dialog_id: overrideDialogId, target_type: 'role', target_id: overrideRoleId, allow, deny }); await onChanged(); showNote({ content: lang?.community_saved || '', type: 'success', time: 4 }); } catch (error) { showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 }); }
  };
  const confirmDelete = () => { const pending = pendingDelete; setPendingDelete(null); if (!pending) return; if (pending.kind === 'category') void deleteCategory(pending.id); else void deleteChannel(pending.id); };
  const back = (heading: string) => <div className="flex items-center gap-3"><button type="button" onClick={() => { resetChannel(); onOpenView('overview'); }} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-800 duration-300 active:scale-95"><svg className="size-5 fill-current" viewBox="0 0 48 48"><use href="#IC-chevron-left" /></svg></button><h3 className="text-lg font-semibold">{heading}</h3></div>;
  const inputClass = 'rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none focus:border-purple-400';
  const primary = 'cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50';
  const channelForm = (action: 'create' | 'update') => <div className="flex flex-col gap-3">{back(action === 'create' ? (lang?.community_create_channel || '') : (lang?.community_edit_channel || ''))}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={lang?.community_channel_name} className={inputClass} /><select value={categoryId ?? ''} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : null)} className={inputClass}><option value="">{lang?.community_channel_uncategorized}</option>{structure.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><Toggle checked={voiceEnabled} label={lang?.community_channel_calls || ''} onChange={setVoiceEnabled} /><Toggle checked={readOnly} label={lang?.community_channel_read_only || ''} onChange={setReadOnly} /><label className="flex flex-col gap-1 text-sm text-zinc-300"><span>{lang?.community_slow_mode || 'Slow mode'}</span><input type="number" min={0} max={21600} value={slowMode} onChange={(event) => setSlowMode(Number(event.target.value))} className={inputClass} /></label><button type="button" disabled={saving || !title.trim()} onClick={() => void saveChannel(action)} className={primary}>{action === 'create' ? lang?.community_create_channel : lang?.save}</button></div>;

  return <div className="flex flex-col gap-3">
    {view === 'overview' ? <><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><button onClick={() => onOpenView('create_channel')} className={primary}>{lang?.community_create_channel}</button><button onClick={() => onOpenView('categories')} className={primary}>{lang?.community_create_category}</button><button onClick={() => onOpenView('channel_permissions')} className={primary}>{lang?.community_channel_permissions}</button></div>{structure.channels.map((channel) => <div key={channel.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3"><span className="min-w-0 flex-1 truncate font-semibold">{channel.title}</span>{channel.voice_enabled ? <span className="text-xs text-green-400">{lang?.community_channel_calls}</span> : null}<button onClick={() => openEdit(channel)} className="cursor-pointer rounded-3xl bg-zinc-700 px-3 py-1.5 duration-300 active:scale-95">{lang?.edit}</button><button onClick={() => setPendingDelete({ id: channel.id, kind: 'channel' })} className="cursor-pointer rounded-3xl bg-red-600/20 px-3 py-1.5 text-red-300 duration-300 active:scale-95">{lang?.delete}</button></div>)}</> : null}
    {view === 'create_channel' ? channelForm('create') : null}{view === 'edit_channel' ? channelForm('update') : null}
    {view === 'categories' ? <div className="flex flex-col gap-3">{back(lang?.community_categories || '')}<div className="flex gap-3"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className={`min-w-0 flex-1 ${inputClass}`} /><button onClick={() => void createCategory()} className={primary}>{lang?.community_create_category}</button></div>{structure.categories.map((category) => <button key={category.id} onClick={() => setPendingDelete({ id: category.id, kind: 'category' })} className="cursor-pointer rounded-3xl bg-zinc-800 p-3 text-left duration-300 active:scale-95">{category.name} ×</button>)}</div> : null}
    {view === 'channel_permissions' ? <div className="flex flex-col gap-3">{back(lang?.community_channel_permissions || '')}<select value={overrideDialogId || ''} onChange={(event) => setOverrideDialogId(Number(event.target.value))} className={inputClass}><option value="">{lang?.community_select_channel}</option>{structure.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.title}</option>)}</select><select value={overrideRoleId || ''} onChange={(event) => setOverrideRoleId(Number(event.target.value))} className={inputClass}><option value="">{lang?.community_select_role}</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>{COMMUNITY_CHANNEL_PERMISSION_NAMES.map((permission) => <div key={permission} className="flex flex-col gap-2 rounded-3xl bg-zinc-800/60 p-3 sm:flex-row sm:items-center"><span className="min-w-0 flex-1 text-sm">{lang?.[`community_permission_${permission}`]}</span><div className="grid grid-cols-3 gap-1">{(['inherit', 'allow', 'deny'] as OverrideValue[]).map((value) => <button key={value} type="button" onClick={() => setOverrideValues((current) => ({ ...current, [permission]: value }))} className={`cursor-pointer rounded-3xl px-3 py-1.5 text-xs duration-300 active:scale-95 ${overrideValues[permission] === value || (!overrideValues[permission] && value === 'inherit') ? value === 'deny' ? 'bg-red-600' : value === 'allow' ? 'bg-green-600' : 'bg-purple-600' : 'bg-zinc-700'}`}>{lang?.[`community_${value}`]}</button>)}</div></div>)}<button onClick={() => void saveOverride()} disabled={!overrideDialogId || !overrideRoleId} className={primary}>{lang?.save}</button></div> : null}
    <ConfirmDeleteModal isOpen={pendingDelete !== null} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete} title={lang?.delete || ''} description={pendingDelete?.kind === 'category' ? (lang?.community_category_delete_confirm || '') : (lang?.community_channel_delete_confirm || '')} confirmLabel={lang?.delete} cancelLabel={lang?.cancel} />
  </div>;
}
