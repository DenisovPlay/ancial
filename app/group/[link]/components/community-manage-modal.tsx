'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { useDragScroll } from '../../../hooks/useDragScroll';
import CommunityChannelEditor from './community-channel-editor';
import CommunityModeration from './community-moderation';
import CommunityRoleEditor from './community-role-editor';
import CommunitySettingsEditor from './community-settings-editor';
import {
  canCommunity,
  visibleManagementTabs,
  type CommunityAuditEntry,
  type CommunityLinkRequest,
  type CommunityManagementTab,
  type CommunityMember,
  type CommunityRoleList,
  type CommunityStructure,
} from '../lib/community-types';
import { communityErrorText } from '../lib/community-error';
import { communityAuditActionLabel, formatCommunityAuditDate } from '../lib/community-presentation';

type Props = {
  communityId: number;
  communityDescription: string;
  communityLink: string;
  communityName: string;
  initialTab?: CommunityManagementTab;
  isOpen: boolean;
  onClose: () => void;
  onCommunitySaved: (nextLink: string) => Promise<void>;
  onStructureChanged: () => Promise<void>;
  structure: CommunityStructure;
};

type ManagementView = 'overview' | 'create_channel' | 'edit_channel' | 'categories' | 'channel_permissions' | 'create_role' | 'edit_role';

export default function CommunityManageModal({ communityDescription, communityId, communityLink, communityName, initialTab = 'community', isOpen, onClose, onCommunitySaved, onStructureChanged, structure }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const tabs = useMemo(() => visibleManagementTabs(structure.permissions), [structure.permissions]);
  const [activeTab, setActiveTab] = useState<CommunityManagementTab>(initialTab);
  const [roles, setRoles] = useState<CommunityRoleList | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [linkRequests, setLinkRequests] = useState<CommunityLinkRequest[]>([]);
  const [audit, setAudit] = useState<CommunityAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [managementView, setManagementView] = useState<ManagementView>('overview');
  const tabsScrollRef = useDragScroll({ speed: 2 });
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const loadManagement = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRoles, nextMembers, nextLinks, nextAudit] = await Promise.all([
        canCommunity(structure.permissions, 'manage_roles') || canCommunity(structure.permissions, 'manage_channels') || canCommunity(structure.permissions, 'manage_members') ? AncialAPI.communityRoles(communityId) : Promise.resolve(null),
        canCommunity(structure.permissions, 'manage_members') || canCommunity(structure.permissions, 'manage_roles') ? AncialAPI.communityMembers(communityId) : Promise.resolve({ members: [] }),
        canCommunity(structure.permissions, 'manage_channels') ? AncialAPI.communityLinkRequests(communityId) : Promise.resolve({ requests: [] }),
        canCommunity(structure.permissions, 'view_audit_log') ? AncialAPI.communityAudit(communityId) : Promise.resolve({ entries: [], has_more: false }),
      ]);
      setRoles(nextRoles);
      setMembers(nextMembers.members);
      setLinkRequests(nextLinks.requests);
      setAudit(nextAudit.entries);
    } catch (error) {
      console.error('Community management loading failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    } finally {
      setLoading(false);
    }
  }, [communityId, lang, showNote, structure.permissions]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => void loadManagement(), 0);
    return () => clearTimeout(timer);
  }, [isOpen, loadManagement]);

  useEffect(() => {
    if (tabs.includes(activeTab)) return;
    const timer = setTimeout(() => setActiveTab(tabs[0] ?? 'channels'), 0);
    return () => clearTimeout(timer);
  }, [activeTab, tabs]);

  const selectTab = (tab: CommunityManagementTab) => {
    setActiveTab(tab);
    setManagementView('overview');
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
  };

  const resolvedActiveTab = tabs.includes(activeTab) ? activeTab : tabs[0] ?? null;

  const closeManagement = useCallback(() => {
    setManagementView('overview');
    setActiveTab(initialTab);
    onClose();
  }, [initialTab, onClose]);

  const refreshAll = useCallback(async () => {
    await Promise.all([onStructureChanged(), loadManagement()]);
  }, [loadManagement, onStructureChanged]);

  const resolveLinkRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      await AncialAPI.mutateCommunityLinkRequest({ community_id: communityId, request_id: requestId, action });
      await refreshAll();
    } catch (error) {
      console.error('Community link request failed', error);
      showNote({ content: communityErrorText(error, lang), type: 'error', time: 5 });
    }
  };

  const tabLabel = (tab: CommunityManagementTab) => lang?.[`community_tab_${tab}`] || tab;

  const tabContent = (
    <>
      {loading && resolvedActiveTab !== 'community' ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-zinc-800/60" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : null}
      {resolvedActiveTab === 'community' ? (
        <CommunitySettingsEditor communityId={communityId} description={communityDescription} link={communityLink} name={communityName} onSaved={onCommunitySaved} />
      ) : null}
      {!loading && resolvedActiveTab === 'channels' ? (
        <CommunityChannelEditor communityId={communityId} onChanged={refreshAll} onOpenView={setManagementView} roles={roles?.roles ?? []} structure={structure} view={managementView} />
      ) : null}
      {!loading && resolvedActiveTab === 'roles' && roles ? (
        <CommunityRoleEditor communityId={communityId} onChanged={refreshAll} onOpenView={setManagementView} roleList={roles} view={managementView} />
      ) : null}
      {!loading && resolvedActiveTab === 'members' ? (
        <CommunityModeration
          actorIsOwner={roles?.is_owner ?? structure.is_owner === true}
          actorPosition={roles?.highest_role_position ?? structure.highest_role_position}
          communityId={communityId}
          members={members}
          onChanged={refreshAll}
          permissions={structure.permissions}
          roles={roles?.roles ?? []}
        />
      ) : null}
      {!loading && resolvedActiveTab === 'link_requests' ? (
        <div className="flex flex-col gap-3">
          {linkRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">{lang?.community_link_requests_empty}</p>
          ) : null}
          {linkRequests.map((request) => (
            <div key={request.id} className="rounded-3xl border border-zinc-700/40 bg-zinc-800/50 p-3">
              <p className="font-semibold text-zinc-100">{request.title}</p>
              <p className="text-xs text-zinc-500">@{request.username}</p>
              {request.message ? <p className="mt-2 text-sm text-zinc-300">{request.message}</p> : null}
              <div className="mt-3 flex gap-3">
                <button type="button" onClick={() => void resolveLinkRequest(request.id, 'approve')} className="cursor-pointer rounded-3xl bg-green-600/20 px-3 py-2 text-sm font-semibold text-green-400 duration-300 hover:bg-green-600 hover:text-white active:scale-95">{lang?.approve}</button>
                <button type="button" onClick={() => void resolveLinkRequest(request.id, 'reject')} className="cursor-pointer rounded-3xl bg-red-600/20 px-3 py-2 text-sm font-semibold text-red-400 duration-300 hover:bg-red-600 hover:text-white active:scale-95">{lang?.reject}</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!loading && resolvedActiveTab === 'audit' ? (
        <div className="flex flex-col gap-3">
          {audit.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">{lang?.community_audit_empty || '—'}</p>
          ) : null}
          {audit.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-zinc-700/40 bg-zinc-800/50 p-3">
              <p className="text-sm font-semibold text-zinc-100">{communityAuditActionLabel(entry.action, lang)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">@{entry.username} · {formatCommunityAuditDate(entry.created_at, lang?.langname)}</p>
              {entry.reason ? <p className="mt-1.5 text-sm text-zinc-300">{entry.reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeManagement}
      title={lang?.community_management || ''}
      closeLabel={lang?.close || lang?.cancel || 'Закрыть'}
      showHeader={false}
      swipeable={false}
      width="xl"
      panelClassName="h-[90dvh]"
      bodyClassName="flex min-h-0 flex-1 !overflow-hidden !p-0"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-20 flex flex-col items-center bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent">
          {/* title + close */}
          <div className="flex w-full items-center justify-between p-3">
            <h2 className="text-xl font-bold text-white">{lang?.community_management}</h2>
            <button
              type="button"
              aria-label={lang?.close || lang?.cancel || 'Закрыть'}
              onClick={closeManagement}
              className="flex cursor-pointer rounded-full border border-transparent p-1.5 duration-300 hover:border-zinc-600/30 hover:bg-zinc-800/50 focus-visible:outline-2 focus-visible:outline-purple-400 active:scale-95"
            >
              <svg className="h-5 w-5 fill-zinc-300" viewBox="0 0 24 24"><use href="#IC-times" /></svg>
            </button>
          </div>

          {/* Мобильный таббар (под заголовком, тоже в хедере) */}
          <div
            ref={tabsScrollRef}
            className="drag-scroll viewport flex w-full flex-nowrap gap-1.5 overflow-x-auto px-3 pb-3 lg:hidden"
            style={{ scrollbarWidth: 'none' }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={`shrink-0 cursor-pointer rounded-3xl px-3 py-2 text-sm duration-300 focus-visible:outline-2 focus-visible:outline-purple-400 active:scale-95 ${
                  resolvedActiveTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Десктопный сайдбар */}
          <aside className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800/60 p-3 pt-[72px] lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={`cursor-pointer rounded-3xl px-3 py-3 text-left text-sm duration-300 focus-visible:outline-2 focus-visible:outline-purple-400 active:scale-95 ${
                  resolvedActiveTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </aside>

          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-3 pt-[112px] lg:pt-[72px]">
              {tabContent}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
