'use client';

import { useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { communityErrorText } from '../lib/community-error';

type Props = {
  communityId: number;
  description: string;
  link: string;
  name: string;
  onSaved: (nextLink: string) => Promise<void>;
};

function sanitizeLink(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

export default function CommunitySettingsEditor({ communityId, description, link, name, onSaved }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [form, setForm] = useState({ desk: description, name, slnk: link });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving || !form.name.trim() || !form.slnk.trim()) return;
    setSaving(true);
    try {
      await AncialAPI.updateGroupInfo({ gid: communityId, ...form });
      showNote({ content: lang?.community_saved || '', type: 'success', time: 4 });
      await onSaved(form.slnk);
    } catch (error) {
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 outline-none duration-300 focus:border-purple-400';
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="rounded-3xl border border-amber-400/30 bg-amber-500/15 p-3 text-sm text-amber-300" dangerouslySetInnerHTML={{ __html: lang?.editgroupWARN || '' }} />
      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        <span>{lang?.linktogroup}</span>
        <span className="flex">
          <span className="flex items-center rounded-l-3xl border border-zinc-600/30 bg-zinc-700 px-3 text-zinc-400">zypo.cc/$</span>
          <input aria-label={lang?.linktogroup} className={`${inputClass} rounded-l-none`} value={form.slnk} onChange={(event) => setForm((current) => ({ ...current, slnk: sanitizeLink(event.target.value) }))} />
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        <span>{lang?.groupname}</span>
        <input className={inputClass} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
        <span>{lang?.groupdesc}</span>
        <textarea className={`${inputClass} min-h-28 resize-y`} maxLength={1000} value={form.desk} onChange={(event) => setForm((current) => ({ ...current, desk: event.target.value }))} />
      </label>
      <button type="submit" disabled={saving || !form.name.trim() || !form.slnk.trim()} className="cursor-pointer rounded-3xl bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">{lang?.apply}</button>
    </form>
  );
}
