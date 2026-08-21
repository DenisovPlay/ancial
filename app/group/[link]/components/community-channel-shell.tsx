'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import CommunityChannelList from './community-channel-list';
import type { CommunityChannel, CommunityStructure } from '../lib/community-types';

type Props = { failed: boolean; structure: CommunityStructure | null };

export default function CommunityChannelShell({ failed, structure }: Props) {
  const router = useRouter();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const openChannel = useCallback(async (channel: CommunityChannel) => {
    if (openingId !== null) return;
    setOpeningId(channel.id);
    try {
      const result = await AncialAPI.joinPublicChat<{ status?: 'joined' | 'requested'; hash?: string | null }>(channel.id);
      if (result.status === 'requested') {
        showNote({ content: lang?.community_channel_request_sent || '', type: 'success', time: 4 });
        return;
      }
      router.push(`/messages/${encodeURIComponent(result.hash || channel.hash)}`);
    } catch (error) {
      showNote({ content: error instanceof Error ? error.message : (lang?.community_channel_join_error || ''), type: 'error', time: 5 });
    } finally {
      setOpeningId(null);
    }
  }, [lang, openingId, router, showNote]);

  if (failed || !structure || !structure.channels.length) return null;

  const content = (
    <CommunityChannelList
      categories={structure.categories}
      channels={structure.channels}
      disabled={openingId !== null}
      onSelect={openChannel}
      selectedId={openingId}
      uncategorizedLabel={lang?.community_channel_uncategorized || ''}
    />
  );

  return (
    <section className="border-x border-zinc-600/30 bg-zinc-900 p-3 md:rounded-3xl md:border">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-lg font-thin text-zinc-300">{lang?.community_channels}</span>
      </div>
      <div className="hidden lg:block">{content}</div>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="w-full cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 duration-300 hover:bg-zinc-700 active:scale-95 lg:hidden"
      >
        {lang?.community_channels_open}
      </button>
      <Modal isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title={lang?.community_channels}>
        {content}
      </Modal>
    </section>
  );
}
