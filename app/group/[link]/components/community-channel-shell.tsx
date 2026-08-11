'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { globalWS } from '../../../lib/global-ws';
import CommunityChannelList from './community-channel-list';
import CommunityChannelView from './community-channel-view';
import type { CommunityChannel, CommunityStructure } from '../lib/community-types';

const GroupVoiceRoomModal = dynamic(() => import('../../../messages/components/group-voice-room-modal'), {
  ssr: false,
});

type Props = {
  communityId: number;
  communityLink: string;
  initialCanManage: boolean;
};

const COMMUNITY_EVENTS = [
  'community:structure_changed',
  'community:permissions_changed',
  'community:role_changed',
  'community:member_roles_changed',
  'community:member_restricted',
  'community:link_request_changed',
];

export default function CommunityChannelShell({ communityId, communityLink, initialCanManage }: Props) {
  const router = useRouter();
  const { lang } = useAuth();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [structure, setStructure] = useState<CommunityStructure | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [voiceChannel, setVoiceChannel] = useState<CommunityChannel | null>(null);
  const [failed, setFailed] = useState(false);

  const loadStructure = useCallback(async () => {
    try {
      const next = await AncialAPI.communityStructure(communityId);
      setStructure(next);
      setSelectedId((current) => current !== null && next.channels.some((channel) => channel.id === current)
        ? current
        : next.channels[0]?.id ?? null);
      setFailed(false);
    } catch (error) {
      console.error('Community channels loading failed', error);
      setFailed(true);
    }
  }, [communityId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadStructure(), 0);
    return () => clearTimeout(timer);
  }, [loadStructure]);

  useEffect(() => {
    const invalidate = (raw?: unknown) => {
      const payload = (raw || {}) as { community_id?: number | string; data?: { community_id?: number | string } };
      const eventCommunityId = Number(payload.community_id ?? payload.data?.community_id ?? 0);
      if (eventCommunityId !== communityId) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => void loadStructure(), 150);
    };
    COMMUNITY_EVENTS.forEach((event) => globalWS.addDialogListener(event, invalidate));
    return () => {
      COMMUNITY_EVENTS.forEach((event) => globalWS.removeDialogListener(event, invalidate));
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [communityId, loadStructure]);

  useEffect(() => {
    if (!voiceChannel) return;
    globalWS.subscribeDialog(voiceChannel.id);
    return () => globalWS.unsubscribeDialog(voiceChannel.id);
  }, [voiceChannel]);

  const selectedChannel = useMemo(
    () => structure?.channels.find((channel) => channel.id === selectedId) ?? null,
    [selectedId, structure?.channels],
  );

  const openChannel = useCallback((channel: CommunityChannel) => {
    setSelectedId(channel.id);
    if (channel.channel_type === 'voice') {
      setVoiceChannel(channel);
      return;
    }
    router.push(`/messages/${encodeURIComponent(channel.hash)}`);
  }, [router]);

  const channelTypeLabel = (channel: CommunityChannel) => {
    if (channel.channel_type === 'voice') return lang?.community_channel_voice || '';
    if (channel.channel_type === 'announcement') return lang?.community_channel_announcement || '';
    return lang?.community_channel_text || '';
  };

  if (!structure && !failed) {
    return <div className="h-28 animate-pulse rounded-3xl border border-zinc-600/30 bg-zinc-900" />;
  }
  if (failed || !structure) return null;

  const content = structure.channels.length > 0 ? (
    <div className="flex flex-col gap-3">
      <CommunityChannelList
        categories={structure.categories}
        channels={structure.channels}
        onSelect={(channel) => setSelectedId(channel.id)}
        selectedId={selectedId}
        uncategorizedLabel={lang?.community_channel_uncategorized || ''}
      />
      {selectedChannel ? (
        <CommunityChannelView
          actionLabel={selectedChannel.channel_type === 'voice'
            ? lang?.community_channel_join_voice || ''
            : lang?.community_channel_open_messages || ''}
          channel={selectedChannel}
          onOpen={() => openChannel(selectedChannel)}
          typeLabel={channelTypeLabel(selectedChannel)}
        />
      ) : null}
    </div>
  ) : (
    <p className="p-3 text-sm text-zinc-400">{lang?.community_channels_empty}</p>
  );

  return (
    <section className="border-x border-zinc-600/30 bg-zinc-900 p-3 md:rounded-3xl md:border">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-lg font-thin text-zinc-300">{lang?.community_channels}</span>
        {initialCanManage || structure.permissions.manage_channels ? (
          <button
            type="button"
            onClick={() => router.push(`/$${communityLink}?manage=community`)}
            className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 py-1 text-xs text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95"
          >
            {lang?.community_channel_manage}
          </button>
        ) : null}
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
      <GroupVoiceRoomModal
        dialogId={voiceChannel?.id ?? 0}
        isOpen={voiceChannel !== null}
        members={[]}
        onClose={() => setVoiceChannel(null)}
        title={voiceChannel?.title ?? ''}
      />
    </section>
  );
}
