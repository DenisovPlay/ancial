'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Modal from '../../../components/modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import CommunityChannelEditor from './community-channel-editor';
import CommunityModeration from './community-moderation';
import CommunityRoleEditor from './community-role-editor';
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

type Props = {
  communityId: number;
  isOpen: boolean;
  onClose: () => void;
  onStructureChanged: () => Promise<void>;
  structure: CommunityStructure;
};

export default function CommunityManageModal({ communityId, isOpen, onClose, onStructureChanged, structure }: Props) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const tabs = useMemo(() => visibleManagementTabs(structure.permissions), [structure.permissions]);
  const [activeTab, setActiveTab] = useState<CommunityManagementTab>(tabs[0] ?? 'channels');
  const [roles, setRoles] = useState<CommunityRoleList | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [linkRequests, setLinkRequests] = useState<CommunityLinkRequest[]>([]);
  const [audit, setAudit] = useState<CommunityAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadManagement = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRoles, nextMembers, nextLinks, nextAudit] = await Promise.all([
        canCommunity(structure.permissions, 'manage_roles') || canCommunity(structure.permissions, 'manage_channels') || canCommunity(structure.permissions, 'manage_members') ? AncialAPI.communityRoles(communityId) : Promise.resolve(null),
        canCommunity(structure.permissions, 'manage_members') ? AncialAPI.communityMembers(communityId) : Promise.resolve({ members: [] }),
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang?.community_management || ''}>
      <div className="flex min-h-[50vh] flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto rounded-3xl bg-zinc-900/70 p-1.5">
          {tabs.map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 cursor-pointer rounded-3xl px-3 py-2 text-sm duration-300 active:scale-95 ${activeTab === tab ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>
              {lang?.[`community_tab_${tab}`] || tab}
            </button>
          ))}
        </div>
        {loading ? <div className="h-40 animate-pulse rounded-3xl bg-zinc-800/60" /> : null}
        {!loading && activeTab === 'channels' ? <CommunityChannelEditor communityId={communityId} onChanged={refreshAll} roles={roles?.roles ?? []} structure={structure} /> : null}
        {!loading && activeTab === 'roles' && roles ? <CommunityRoleEditor communityId={communityId} onChanged={refreshAll} roleList={roles} /> : null}
        {!loading && activeTab === 'members' ? <CommunityModeration communityId={communityId} members={members} onChanged={refreshAll} roles={roles?.roles ?? []} /> : null}
        {!loading && activeTab === 'link_requests' ? (
          <div className="flex flex-col gap-3">
            {linkRequests.length === 0 ? <p className="text-sm text-zinc-400">{lang?.community_link_requests_empty}</p> : null}
            {linkRequests.map((request) => (
              <div key={request.id} className="rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
                <p className="font-semibold text-zinc-100">{request.title}</p>
                <p className="text-xs text-zinc-500">@{request.username}</p>
                {request.message ? <p className="my-2 text-sm text-zinc-300">{request.message}</p> : null}
                <div className="mt-3 flex gap-3">
                  <button type="button" onClick={() => void resolveLinkRequest(request.id, 'approve')} className="cursor-pointer rounded-3xl bg-green-600 px-3 py-2 text-sm text-white duration-300 hover:bg-green-500 active:scale-95">{lang?.approve}</button>
                  <button type="button" onClick={() => void resolveLinkRequest(request.id, 'reject')} className="cursor-pointer rounded-3xl bg-red-600 px-3 py-2 text-sm text-white duration-300 hover:bg-red-500 active:scale-95">{lang?.reject}</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && activeTab === 'audit' ? (
          <div className="flex flex-col gap-2">
            {audit.map((entry) => (
              <div key={entry.id} className="rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3">
                <p className="text-sm font-semibold text-zinc-100">{entry.action}</p>
                <p className="text-xs text-zinc-500">@{entry.username} · {entry.created_at}</p>
                {entry.reason ? <p className="mt-1 text-sm text-zinc-300">{entry.reason}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
