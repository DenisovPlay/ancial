'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache.ts';
import { globalWS } from '../../../lib/global-ws';
import CommunityChannelList from './community-channel-list';
import CommunityChannelView from './community-channel-view';
import CommunityManageModal from './community-manage-modal';
import {
  COMMUNITY_INVALIDATION_DELAY_MS,
  communityStructureCacheKey,
  communityEventMatches,
  retainCommunityChannelSelection,
  validateCachedCommunityStructure,
  type CommunityChannel,
  type CommunityStructure,
} from '../lib/community-types';

type Props = {
  communityId: number;
  communityLink: string;
  initialCanManage: boolean;
};

type StatefulProps = Props & {
  cacheKey: string;
};

const COMMUNITY_EVENTS = [
  'community:structure_changed',
  'community:permissions_changed',
  'community:role_changed',
  'community:member_roles_changed',
  'community:member_restricted',
  'community:link_request_changed',
];

export default function CommunityChannelShell(props: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-3xl border border-zinc-600/30 bg-zinc-900" />;
  }

  const viewerId = isAuthenticated ? (user?.id || 'authenticated') : null;
  const cacheKey = communityStructureCacheKey(props.communityId, viewerId);
  return <CommunityChannelShellState key={cacheKey} {...props} cacheKey={cacheKey} />;
}

function CommunityChannelShellState({ cacheKey, communityId, communityLink, initialCanManage }: StatefulProps) {
  const router = useRouter();
  const { lang } = useAuth();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [structure, setStructure] = useState<CommunityStructure | null>(() => (
    validateCachedCommunityStructure(
      cache.get<unknown>(cacheKey, { category: 'groups', subcategory: 'profile' }),
      communityId,
    )
  ));
  const hasUsableStructureRef = useRef(structure !== null);
  const [selectedId, setSelectedId] = useState<number | null>(() => (
    retainCommunityChannelSelection(structure?.channels ?? [], null)
  ));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadStructure = useCallback(async () => {
    try {
      const next = await AncialAPI.communityStructure(communityId);
      const validated = validateCachedCommunityStructure(next, communityId);
      if (!validated) throw new Error('Invalid community structure response');
      hasUsableStructureRef.current = true;
      setStructure(validated);
      setSelectedId((current) => retainCommunityChannelSelection(validated.channels, current));
      cache.set(cacheKey, validated, { category: 'groups', subcategory: 'profile' });
      setFailed(false);
    } catch (error) {
      console.error('Community channels loading failed', error);
      if (!hasUsableStructureRef.current) setFailed(true);
    }
  }, [cacheKey, communityId]);
  const refreshStructure = useEffectEvent(() => void loadStructure());

  useEffect(() => {
    const timer = setTimeout(refreshStructure, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const invalidate = (raw?: unknown) => {
      if (!communityEventMatches(raw, communityId)) return;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(refreshStructure, COMMUNITY_INVALIDATION_DELAY_MS);
    };
    COMMUNITY_EVENTS.forEach((event) => globalWS.addDialogListener(event, invalidate));
    return () => {
      COMMUNITY_EVENTS.forEach((event) => globalWS.removeDialogListener(event, invalidate));
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [communityId]);

  const selectedChannel = useMemo(
    () => structure?.channels.find((channel) => channel.id === selectedId) ?? null,
    [selectedId, structure?.channels],
  );

  const openChannel = useCallback((channel: CommunityChannel) => {
    setSelectedId(channel.id);
    if (channel.channel_type === 'voice') {
      const returnPath = `/group/${communityLink}`;
      router.push(`/call/group/${encodeURIComponent(channel.hash)}?return=${encodeURIComponent(returnPath)}`);
      return;
    }
    router.push(`/messages/${encodeURIComponent(channel.hash)}`);
  }, [communityLink, router]);

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
            title={`$${communityLink}`}
            onClick={() => setManageOpen(true)}
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
      <CommunityManageModal
        communityId={communityId}
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onStructureChanged={loadStructure}
        structure={structure}
      />
    </section>
  );
}
