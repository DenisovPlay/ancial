'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
import { formatCommunityAuditDate } from '../lib/community-presentation';

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

type ManagementView = 'overview' | 'create_channel' | 'categories' | 'channel_permissions' | 'create_role';

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
  const [render, setRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [offsetY, setOffsetY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const tabsScrollRef = useDragScroll({ speed: 2 });
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Анимация появления/скрытия — точно как в Modal
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      let vf = 0;
      const rf = requestAnimationFrame(() => {
        setRender(true);
        vf = requestAnimationFrame(() => setVisible(true));
      });
      return () => { cancelAnimationFrame(rf); cancelAnimationFrame(vf); };
    }
    document.body.style.overflow = '';
    const f = requestAnimationFrame(() => setVisible(false));
    const t = setTimeout(() => { setRender(false); setOffsetY(0); }, 300);
    return () => { cancelAnimationFrame(f); clearTimeout(t); };
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

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
    if (tabs.includes(initialTab)) setActiveTab(initialTab);
    const timer = setTimeout(() => void loadManagement(), 0);
    return () => clearTimeout(timer);
  }, [initialTab, isOpen, loadManagement, tabs]);

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

  const closeManagement = useCallback(() => {
    setManagementView('overview');
    onClose();
  }, [onClose]);

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

  // Свайп — только по хедеру (drag handle)
  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) setOffsetY(diff);
  };
  const handleTouchEnd = () => {
    if (offsetY > 100) closeManagement();
    setOffsetY(0);
    startYRef.current = null;
  };

  if (typeof document === 'undefined' || !render) return null;

  const tabLabel = (tab: CommunityManagementTab) => lang?.[`community_tab_${tab}`] || tab;

  const tabContent = (
    <>
      {loading && activeTab !== 'community' ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-3xl bg-zinc-800/60" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : null}
      {activeTab === 'community' ? (
        <CommunitySettingsEditor communityId={communityId} description={communityDescription} link={communityLink} name={communityName} onSaved={onCommunitySaved} />
      ) : null}
      {!loading && activeTab === 'channels' ? (
        <CommunityChannelEditor communityId={communityId} onChanged={refreshAll} onOpenView={setManagementView} roles={roles?.roles ?? []} structure={structure} view={managementView} />
      ) : null}
      {!loading && activeTab === 'roles' && roles ? (
        <CommunityRoleEditor communityId={communityId} onChanged={refreshAll} onOpenView={setManagementView} roleList={roles} view={managementView} />
      ) : null}
      {!loading && activeTab === 'members' ? (
        <CommunityModeration communityId={communityId} members={members} onChanged={refreshAll} roles={roles?.roles ?? []} />
      ) : null}
      {!loading && activeTab === 'link_requests' ? (
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
      {!loading && activeTab === 'audit' ? (
        <div className="flex flex-col gap-3">
          {audit.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">{lang?.community_audit_empty || '—'}</p>
          ) : null}
          {audit.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-zinc-700/40 bg-zinc-800/50 p-3">
              <p className="text-sm font-semibold text-zinc-100">{entry.action}</p>
              <p className="mt-0.5 text-xs text-zinc-500">@{entry.username} · {formatCommunityAuditDate(entry.created_at, lang?.langname)}</p>
              {entry.reason ? <p className="mt-1.5 text-sm text-zinc-300">{entry.reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  const panelAnimClass = visible
    ? 'translate-y-0 sm:scale-100 opacity-100'
    : 'translate-y-full sm:translate-y-8 sm:scale-95 opacity-0';

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300 ease-out sm:items-center ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={closeManagement}
    >
      {/* Панель — фиксированная высота чтобы не прыгала */}
      <div
        className={`relative flex w-full flex-col overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300 ease-out sm:w-[1180px] sm:max-w-[calc(100vw-2rem)] ${panelAnimClass} rounded-t-3xl sm:rounded-3xl`}
        style={{
          height: '90vh',
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
          transition: offsetY === 0 ? 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Хедер: absolute поверх, с градиентом как в Modal ── */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex flex-col items-center bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* drag handle */}
          <div className="flex w-full justify-center pt-3 sm:hidden cursor-grab active:cursor-grabbing">
            <div className="h-1.5 w-12 rounded-full bg-zinc-700" />
          </div>

          {/* title + close */}
          <div className="flex w-full items-center justify-between px-3 pb-3 sm:pt-3">
            <h2 className="text-xl font-bold text-white">{lang?.community_management}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={closeManagement}
              className="hidden cursor-pointer rounded-full border border-transparent p-1.5 duration-300 hover:bg-zinc-800/50 hover:border-zinc-600/30 active:scale-95 sm:flex"
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
                className={`shrink-0 cursor-pointer rounded-3xl px-3 py-2 text-sm duration-300 active:scale-95 ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Тело: flex row, заполняет оставшееся место ── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Десктопный сайдбар */}
          <aside className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800/60 p-3 pt-[72px] lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => selectTab(tab)}
                className={`cursor-pointer rounded-3xl px-3 py-3 text-left text-sm duration-300 active:scale-95 ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                {tabLabel(tab)}
              </button>
            ))}
          </aside>

          {/* Контент — единственный скролл */}
          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Паддинг сверху учитывает высоту хедера */}
            <div className="p-3 pt-[112px] lg:pt-[72px]">
              {tabContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
