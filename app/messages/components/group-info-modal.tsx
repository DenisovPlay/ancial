'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/modal';
import AccountName from '../../components/account-name';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI, getApiMessage } from '../../lib/api-v2';
import { uploadImage } from '../../lib/upload';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../lib/messages-shared';
import { SITE_URL } from '../../config';
import { globalWS } from '../../lib/global-ws';
import type { CommunityPermissionMap } from '../../group/[link]/lib/community-types';
import { resolveCommunityChatAccess } from '../lib/community-chat-access';
import {
  getCommunityRoleBadgeStyle,
  getCommunityRoleLabel,
  type CommunityDisplayRole,
} from '../lib/community-role';

interface GroupMember {
  id: number;
  username?: string;
  fname?: string;
  lname?: string;
  name?: string | null;
  img?: string;
  verify?: number;
  role: 'owner' | 'admin' | 'member';
  community_role?: CommunityDisplayRole | null;
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogId: number;
  title: string;
  avatar: string;
  background?: string;
  inviteCode: string;
  canManageInvites?: boolean;
  myRole: 'owner' | 'admin' | 'member';
  members: GroupMember[];
  visibility?: 'private' | 'unlisted' | 'public' | string | null;
  joinPolicy?: 'invite' | 'open' | 'request' | string | null;
  communityId?: number | string | null;
  communityPermissions?: CommunityPermissionMap | null;
  description?: string | null;
  voiceEnabled?: boolean | number | string | null;
  onGroupUpdated: (partial?: { avatar?: string; title?: string; background?: string }) => void;
  onLeave?: () => void;
}

type ModalView = 'main' | 'add_members' | 'edit_title' | 'community_settings';

interface ManagedCommunity {
  id: number;
  name: string;
}

interface ChatJoinRequest {
  id: number;
  user_id: number;
  username?: string;
  fname?: string;
  lname?: string;
  img?: string;
  message?: string | null;
}

export default function GroupInfoModal({
  isOpen,
  onClose,
  dialogId,
  title,
  avatar,
  background = '',
  inviteCode: initialInviteCode,
  canManageInvites: hasInvitePermission = false,
  myRole,
  members,
  visibility: initialVisibility = 'private',
  joinPolicy: initialJoinPolicy = 'invite',
  communityId: initialCommunityId = null,
  communityPermissions = null,
  description: initialDescription = '',
  voiceEnabled: initialVoiceEnabled = true,
  onGroupUpdated,
  onLeave,
}: GroupInfoModalProps) {
  const { lang, user } = useAuth();
  const { showNote } = useNotification();

  const [view, setView] = useState<ModalView>('main');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [editTitle, setEditTitle] = useState(title);
  const [currentAvatar, setCurrentAvatar] = useState(avatar);
  const [loadingAction, setLoadingAction] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const [friendsList, setFriendsList] = useState<Array<{ id: number; username?: string; name?: string; fname?: string; lname?: string; img?: string; verify?: number }>>([]);

  /** Формы ответа socialAction('friends'): массив или обёртки friends/data. */
  const extractFriends = (res: unknown): Array<{ id: number; username?: string; name?: string; fname?: string; lname?: string; img?: string; verify?: number }> => {
    type FriendEntry = { id: number; username?: string; name?: string; fname?: string; lname?: string; img?: string; verify?: number };
    const r = res as FriendEntry[] | { friends?: FriendEntry[]; data?: FriendEntry[] | { friends?: FriendEntry[] } } | null;
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.friends)) return r.friends;
    if (Array.isArray(r?.data)) return r.data;
    if (r?.data && typeof r.data === 'object' && Array.isArray(r.data.friends)) return r.data.friends;
    return [];
  };
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>(initialVisibility === 'public' ? 'public' : 'private');
  const [joinPolicy, setJoinPolicy] = useState<'invite' | 'open' | 'request'>(
    initialJoinPolicy === 'request' ? 'request' : initialJoinPolicy === 'open' ? 'open' : 'invite',
  );
  const [communityId, setCommunityId] = useState(initialCommunityId ? String(initialCommunityId) : '');
  const [description, setDescription] = useState(initialDescription || '');
  const [voiceEnabled, setVoiceEnabled] = useState(
    initialVoiceEnabled === true || initialVoiceEnabled === 1 || initialVoiceEnabled === '1',
  );
  const [managedCommunities, setManagedCommunities] = useState<ManagedCommunity[]>([]);
  const [joinRequests, setJoinRequests] = useState<ChatJoinRequest[]>([]);

  const access = resolveCommunityChatAccess({
    communityId: initialCommunityId,
    legacyCanManageInvites: hasInvitePermission,
    legacyRole: myRole,
    permissions: communityPermissions,
  });
  const canManageChannel = access.canManageChannel;
  const canManageMembers = access.canManageMembers;
  const canManageJoinRequests = access.canManageJoinRequests;
  const canManageInvites = access.canManageInvites && Boolean(inviteCode || initialInviteCode);
  const currentUserId = user?.id ? Number(user.id) : 0;

  useEffect(() => {
    if (isOpen) {
      // Открытие модалки: инициализация из пропов — сеттлер здесь источник правды.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('main');
      setEditTitle(title);
      setCurrentAvatar(avatar);
      setInviteCode(initialInviteCode);
      setSelectedAddUserIds(new Set());
      setSearchQuery('');
      setVisibility(initialVisibility === 'public' ? 'public' : 'private');
      setJoinPolicy(initialJoinPolicy === 'request' ? 'request' : initialJoinPolicy === 'open' ? 'open' : 'invite');
      setCommunityId(initialCommunityId ? String(initialCommunityId) : '');
      setDescription(initialDescription || '');
      setVoiceEnabled(initialVoiceEnabled === true || initialVoiceEnabled === 1 || initialVoiceEnabled === '1');
    }
  }, [isOpen, title, avatar, initialInviteCode, initialVisibility, initialJoinPolicy, initialCommunityId, initialDescription, initialVoiceEnabled]);

  useEffect(() => {
    if (!isOpen || !canManageJoinRequests) return;

    const refreshRequests = (payload?: unknown) => {
      const eventPayload = payload && typeof payload === 'object'
        ? payload as { data?: { dialog_id?: number | string }; dialog_id?: number | string }
        : null;
      const eventDialogId = Number(eventPayload?.data?.dialog_id ?? eventPayload?.dialog_id ?? 0);
      if (eventDialogId > 0 && eventDialogId !== dialogId) return;

      void AncialAPI.getChatJoinRequests<{ requests?: ChatJoinRequest[] }>(dialogId)
        .then((result) => setJoinRequests(Array.isArray(result?.requests) ? result.requests : []))
        .catch(() => { });
    };

    globalWS.addDialogListener('chat:join_request', refreshRequests);
    globalWS.addDialogListener('chat:join_request_resolved', refreshRequests);
    return () => {
      globalWS.removeDialogListener('chat:join_request', refreshRequests);
      globalWS.removeDialogListener('chat:join_request_resolved', refreshRequests);
    };
  }, [canManageJoinRequests, dialogId, isOpen]);

  const openCommunitySettings = async () => {
    setView('community_settings');
    const [communitiesResult, requestsResult] = await Promise.allSettled([
      !initialCommunityId && myRole === 'owner'
        ? AncialAPI.getManagedCommunities<{ communities?: ManagedCommunity[] }>()
        : Promise.resolve({ communities: [] }),
      canManageJoinRequests
        ? AncialAPI.getChatJoinRequests<{ requests?: ChatJoinRequest[] }>(dialogId)
        : Promise.resolve({ requests: [] }),
    ]);
    setManagedCommunities(
      communitiesResult.status === 'fulfilled' && Array.isArray(communitiesResult.value?.communities)
        ? communitiesResult.value.communities
        : [],
    );
    setJoinRequests(
      requestsResult.status === 'fulfilled' && Array.isArray(requestsResult.value?.requests)
        ? requestsResult.value.requests
        : [],
    );
  };

  const moderateJoinRequest = async (requestId: number, action: 'approve' | 'reject') => {
    setLoadingAction(true);
    try {
      await AncialAPI.moderateChatJoinRequest(dialogId, requestId, action);
      setJoinRequests((current) => current.filter((request) => request.id !== requestId));
      showNote({
        content: action === 'approve'
          ? (lang?.chat_request_approved || 'Заявка одобрена')
          : (lang?.chat_request_rejected || 'Заявка отклонена'),
        type: 'success',
        time: 3,
      });
      onGroupUpdated();
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.somethingwrong || 'Произошла ошибка'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const saveCommunitySettings = async () => {
    setLoadingAction(true);
    try {
      await AncialAPI.request('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'update_community_settings',
          visibility,
          join_policy: visibility === 'private' ? 'invite' : joinPolicy,
          community_id: communityId ? Number(communityId) : null,
          description: description.trim(),
          voice_enabled: voiceEnabled,
        }),
      });
      showNote({ content: lang?.chat_settings_saved || 'Настройки чата сохранены', type: 'success', time: 3 });
      setView('main');
      onGroupUpdated();
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.somethingwrong || 'Произошла ошибка'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await AncialAPI.socialAction<unknown>('friends');
      const list = extractFriends(res);

      const memberIds = new Set(members.map((m) => m.id));
      setFriendsList(list.filter((f) => f?.id && !memberIds.has(Number(f.id))));
    } catch {
      showNote({ content: lang?.failed_load_friends || 'Не удалось загрузить список друзей', type: 'error', time: 3 });
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleOpenAddMembers = () => {
    setView('add_members');
    setSelectedAddUserIds(new Set());
    setSearchQuery('');
    void fetchFriends();
  };

  const toggleSelectAddUser = (id: number) => {
    const next = new Set(selectedAddUserIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAddUserIds(next);
  };

  const handleAddMembersSubmit = async () => {
    if (!selectedAddUserIds.size) return;
    setLoadingAction(true);
    try {
      const res = await AncialAPI.request<{ message?: string; added_count?: number }>('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'add_members',
          user_ids: Array.from(selectedAddUserIds),
        }),
      });
      showNote({ content: getApiMessage(res?.message, lang, lang?.members_added || 'Участники добавлены'), type: 'success', time: 3 });
      setView('main');
      setSelectedAddUserIds(new Set());
      onGroupUpdated();
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.error_adding_members || 'Ошибка добавления участников'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/messages/invite/${inviteCode || initialInviteCode}`
    : `${SITE_URL}/messages/invite/${inviteCode || initialInviteCode}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showNote({ content: lang?.invite_link_copied || 'Ссылка-приглашение скопирована в буфер обмена', type: 'success', time: 3 });
    } catch {
      showNote({ content: inviteUrl, type: 'info', time: 5 });
    }
  };

  const handleResetInviteCode = async () => {
    setLoadingAction(true);
    try {
      const res = await AncialAPI.request<{
        invite_code: string;
        message: string;
      }>('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'reset_invite_code',
        }),
      });

      if (res?.invite_code) {
        setInviteCode(res.invite_code);
        showNote({ content: lang?.invite_link_reset || 'Ссылка-приглашение сброшена', type: 'success', time: 3 });
        onGroupUpdated();
      } else {
        showNote({ content: lang?.failed_reset_invite_link || 'Не удалось сбросить ссылку', type: 'error', time: 4 });
      }
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.somethingwrong || 'Произошла ошибка =('), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    showNote({ content: lang?.uploading_avatar || 'Загрузка аватарки...', type: 'info', time: 3 });

    try {
      const imageUrl = await uploadImage(file);

      if (!imageUrl) {
        throw new Error(lang?.error_uploading_photo || 'Ошибка загрузки фото');
      }

      await AncialAPI.request('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'update_info',
          title: title,
          avatar: imageUrl,
        }),
      });

      setCurrentAvatar(imageUrl);
      showNote({ content: lang?.group_avatar_updated || 'Аватарка группы обновлена', type: 'success', time: 3 });
      onGroupUpdated({ avatar: imageUrl });
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.error_uploading_image || 'Ошибка загрузки изображения'), type: 'error', time: 3 });
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canManageChannel) return;

    setUploadingBackground(true);
    showNote({ content: lang?.['loading...'] || 'Загрузка...', type: 'info', time: 3 });
    try {
      const uploadedUrl = await uploadImage(file);
      if (!uploadedUrl) throw new Error(lang?.error_uploading_image || 'Ошибка загрузки изображения');

      const result = await AncialAPI.updateDialogBackground<{ image_url?: string }>(dialogId, uploadedUrl);
      const nextBackground = result?.image_url || uploadedUrl;
      onGroupUpdated({ background: nextBackground });
      showNote({ content: lang?.backgroundupdated || 'Фон обновлён', type: 'success', time: 3 });
    } catch (err: unknown) {
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failed_to_update_background || 'Не удалось обновить фон'),
        type: 'error',
        time: 4,
      });
    } finally {
      setUploadingBackground(false);
      event.target.value = '';
    }
  };

  const handleBackgroundClear = async () => {
    if (!canManageChannel || uploadingBackground) return;

    setUploadingBackground(true);
    try {
      await AncialAPI.updateDialogBackground(dialogId, '');
      onGroupUpdated({ background: '' });
      showNote({ content: lang?.done || 'Готово', type: 'success', time: 3 });
    } catch (err: unknown) {
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failed_to_update_background || 'Не удалось обновить фон'),
        type: 'error',
        time: 4,
      });
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === title) {
      setView('main');
      return;
    }

    setLoadingAction(true);
    try {
      await AncialAPI.request('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'update_info',
          title: editTitle.trim(),
          avatar: currentAvatar || avatar,
        }),
      });

      showNote({ content: lang?.group_name_updated || 'Название группы обновлено', type: 'success', time: 3 });
      setView('main');
      onGroupUpdated({ title: editTitle.trim() });
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failed_update_group_name || 'Не удалось обновить название'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveMember = async (targetUid: number) => {
    setLoadingAction(true);
    try {
      await AncialAPI.request('/messages/GroupAction.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
          action: 'remove_member',
          target_user_id: targetUid,
        }),
      });

      showNote({ content: lang?.member_removed_from_chat || 'Участник удален из чата', type: 'success', time: 3 });
      onGroupUpdated();
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failed_remove_member || 'Не удалось удалить участника'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLeaveGroup = async () => {
    setLoadingAction(true);
    try {
      await AncialAPI.request('/messages/LeaveGroup.php', {
        method: 'POST',
        body: JSON.stringify({
          dialog_id: dialogId,
        }),
      });

      showNote({ content: lang?.you_left_group || 'Вы вышли из беседы', type: 'info', time: 3 });
      onClose();
      if (onLeave) {
        onLeave();
      } else {
        onGroupUpdated();
      }
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failed_leave_chat || 'Не удалось выйти из чата'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredFriends = friendsList.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullName = (f.name || `${f.fname || ''} ${f.lname || ''}`).toLowerCase();
    const uname = (f.username || '').toLowerCase();
    return fullName.includes(q) || uname.includes(q);
  });

  const getMembersCountText = (count: number) => {
    if (count === 1) return `${count} ${lang?.group_members_1 || 'участник'}`;
    if (count > 1 && count < 5) return `${count} ${lang?.group_members_2_4 || 'участника'}`;
    return `${count} ${lang?.group_members_5 || 'участников'}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === 'add_members'
          ? (lang?.add_members || 'Добавление участников')
          : view === 'edit_title'
            ? (lang?.edit_chat || 'Изменить чат')
            : view === 'community_settings'
              ? (lang?.chat_settings || 'Настройки доступа')
              : ''
      }
      bodyClassName="!overflow-hidden p-3 pt-14 pb-3"
    >
      <div className="flex flex-col gap-3 text-white">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBackgroundUpload}
        />

        {/* Кнопка «Назад» при нахождении во вложенном табе */}
        {view !== 'main' && (
          <button
            type="button"
            onClick={() => setView('main')}
            className="self-start flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium duration-300 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span>{lang?.back || 'Назад'}</span>
          </button>
        )}

        {/* --- VIEW 1: ГЛАВНЫЙ ЭКРАН СВОЙСТВ --- */}
        {view === 'main' && (
          <>
            {/* Единая шапка группы */}
            <div className="flex flex-col items-center gap-3 -mt-9 sm:-mt-13 z-[1000] sm:mr-10 sm:pl-10">
              <div
                className={`relative group shrink-0 ${canManageChannel ? 'cursor-pointer active:scale-95 duration-300' : ''}`}
                onClick={() => canManageChannel && avatarInputRef.current?.click()}
                title={canManageChannel ? (lang?.change_group_avatar || 'Сменить аватарку группы') : undefined}
              >
                <img
                  src={normalizeAssetUrl(currentAvatar || avatar, FALLBACK_AVATAR)}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-lg border border-zinc-600/30 group-hover:opacity-85 duration-300"
                />
                {canManageChannel && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 duration-300">
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                        <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 5z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 text-center w-full">
                <div className="flex items-center justify-center gap-2 max-w-full">
                  <span className="text-lg font-medium truncate">{title}</span>
                </div>

                <span className="text-xs text-zinc-400">
                  {getMembersCountText(members.length)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {canManageInvites ? (
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-zinc-800 hover:bg-zinc-800/70 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <use href="#IC-plus"></use>
                  </svg>
                  <span className="text-sm sm:text-md">{lang?.invite || 'Пригласить'}</span>
                </button>
              ) : null}
              {canManageChannel && (
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(title);
                    setView('edit_title');
                  }}
                  className="disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-zinc-800 hover:bg-zinc-800/70 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <use href="#IC-edit"></use>
                  </svg>
                  <span className="text-sm sm:text-md">{lang?.edit_action || 'Изменить'}</span>
                </button>
              )}
              {(canManageChannel || canManageJoinRequests) && (
                <button
                  type="button"
                  onClick={() => void openCommunitySettings()}
                  className="disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-zinc-800 hover:bg-zinc-800/70 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <use href="#IC-settings"></use>
                  </svg>
                  <span className="text-sm sm:text-md">{lang?.settings || 'Настройки'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={loadingAction}
                className="col-span-full disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-red-800/25 hover:bg-red-800/50 text-red-500 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <use href="#IC-exit"></use>
                </svg>
                <span className="text-sm sm:text-md">{lang?.leave || 'Покинуть'}</span>
              </button>
            </div>

            {/* Список участников */}
            <div className="flex flex-col gap-2 -mb-1.5">
              <div className="z-[30] flex items-center justify-between bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent">
                <span className="text-sm text-zinc-300">{lang?.members || 'Участники'} ({members.length})</span>
                {(canManageMembers || canManageInvites) && (
                  <button
                    type="button"
                    onClick={handleOpenAddMembers}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer active:scale-95 duration-300"
                  >
                    {lang?.add_member_btn || '+ Добавить'}
                  </button>
                )}
              </div>

              <div className="flex flex-col max-h-80 overflow-y-auto -mb-8 pb-8 -mt-5 pt-5 -mx-3">
                {members.map((member) => {
                  const userObj = {
                    id: member.id,
                    username: member.username,
                    fname: member.fname || member.name || member.username || (lang?.user_fallback || 'Пользователь'),
                    lname: member.lname || '',
                    img: member.img,
                    verify: member.verify,
                  };
                  const communityRoleLabel = getCommunityRoleLabel(member.community_role, lang);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-3 py-1.5 hover:rounded-3xl shrink-0 hover:bg-zinc-800/40 duration-300"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={normalizeAssetUrl(member.img, FALLBACK_AVATAR)}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <AccountName user={userObj} nameClassName="text-sm font-medium text-white truncate" />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0 min-w-0">
                        {communityRoleLabel ? (
                          <span
                            className="max-w-32 truncate text-xs px-2 py-1 rounded-3xl border"
                            style={getCommunityRoleBadgeStyle(member.community_role!)}
                            title={communityRoleLabel}
                          >
                            {communityRoleLabel}
                          </span>
                        ) : (!initialCommunityId && member.role === 'owner' ? (
                          <span className="text-xs text-purple-400 bg-purple-500/25 px-2 py-1 rounded-3xl border border-zinc-600/30">
                            {lang?.role_owner || 'Создатель'}
                          </span>
                        ) : null)}

                        {canManageMembers && member.id !== currentUserId && member.role !== 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loadingAction}
                            className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full transition-[color,background-color,transform] duration-300 active:scale-95 cursor-pointer shrink-0"
                            title={lang?.remove_from_group || 'Исключить из группы'}
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* --- VIEW 2: ИЗМЕНЕНИЕ НАЗВАНИЯ --- */}
        {view === 'edit_title' && (
          <div className="flex flex-col w-full gap-3">
            <div className="flex items-center justify-center gap-3 w-full">
              <div
                className={`relative group shrink-0 ${canManageChannel ? 'cursor-pointer' : ''}`}
                onClick={() => canManageChannel && avatarInputRef.current?.click()}
                title={canManageChannel ? (lang?.change_group_avatar || 'Сменить аватарку группы') : undefined}
              >
                <img
                  src={normalizeAssetUrl(currentAvatar || avatar, FALLBACK_AVATAR)}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-lg border border-zinc-600/30 group-hover:opacity-85 duration-300"
                />
                {canManageChannel && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 duration-300">
                    {uploadingAvatar ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                        <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col w-full -mt-3.5">
                <span className="text-zinc-400 pl-4 z-20">{lang?.chat_name || 'Название чата'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={lang?.eg_chat_name || 'Например: Проект Zypo'}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className={`grid ${canManageInvites ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full items-center justify-center`}>
              {canManageInvites && (
                <button
                  type="button"
                  onClick={handleResetInviteCode}
                  disabled={loadingAction}
                  className="w-full p-3 rounded-3xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm duration-300 active:scale-95 cursor-pointer border border-zinc-600/30"
                >
                  {lang?.reset_link || 'Сбросить ссылку'}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={loadingAction || !editTitle.trim()}
                className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm duration-300 active:scale-95 cursor-pointer border border-zinc-600/30"
              >
                {loadingAction ? (lang?.saving || 'Сохранение...') : (lang?.save || 'Сохранить')}
              </button>
            </div>

            {canManageChannel && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-zinc-300">{lang?.change_bg || 'Изменить фон'}</span>
                <div className="drag-scroll viewport -my-3 flex gap-3 overflow-x-auto px-1 py-3">
                  <button
                    type="button"
                    disabled={uploadingBackground}
                    onClick={() => void handleBackgroundClear()}
                    className={`flex h-32 w-20 shrink-0 cursor-pointer flex-col items-center rounded-2xl bg-zinc-800 p-3 shadow duration-300 disabled:opacity-50 active:scale-95 ${!background ? 'ring-2 ring-purple-500' : ''}`}
                  >
                    <span className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-700 px-1.5 text-left text-sm text-zinc-200">Hello</span>
                    <span className="w-full rounded-2xl rounded-br-none bg-purple-700 px-1.5 text-left text-sm text-white">Hi!</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingBackground}
                    onClick={() => backgroundInputRef.current?.click()}
                    className={`flex h-32 w-20 shrink-0 cursor-pointer flex-col items-center rounded-2xl bg-gradient-to-br from-purple-700 to-blue-700 bg-cover bg-center p-3 shadow duration-300 disabled:opacity-50 active:scale-95 ${background ? 'ring-2 ring-purple-500' : ''}`}
                    style={background ? { backgroundImage: `url(${background})` } : undefined}
                  >
                    <span className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-800/80 px-1.5 text-left text-sm text-zinc-200">Hello</span>
                    <span className="w-full rounded-2xl rounded-br-none bg-purple-700/80 px-1.5 text-left text-sm text-white">Hi!</span>
                    <span className="flex h-full flex-grow items-end">
                      {uploadingBackground ? (
                        <svg className="h-10 w-10 animate-spin fill-purple-100" viewBox="0 0 48 48"><use href="#IC-loader" /></svg>
                      ) : (
                        <svg className="h-10 w-10 fill-purple-100" viewBox="0 0 48 48"><use href="#IC-image" /></svg>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'community_settings' && (
          <div className="flex flex-col gap-3">
            {canManageChannel ? (
              <>
                <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
                  <span>{lang?.chat_visibility || 'Доступ к чату'}</span>
                  <select
                    value={visibility}
                    onChange={(event) => {
                      const nextVisibility = event.target.value === 'public' ? 'public' : 'private';
                      setVisibility(nextVisibility);
                      if (nextVisibility === 'private') setJoinPolicy('invite');
                    }}
                    className="h-12 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800/90 px-3 outline-none"
                  >
                    <option value="private">{lang?.chat_visibility_private || 'Приватный — только по приглашению'}</option>
                    <option value="public">{lang?.chat_visibility_public || 'Публичный — виден всем'}</option>
                  </select>
                </label>

                {visibility === 'public' ? (
                  <>
                    <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
                      <span>{lang?.chat_join_policy || 'Как вступать'}</span>
                      <select
                        value={joinPolicy}
                        onChange={(event) => setJoinPolicy(event.target.value === 'request' ? 'request' : 'open')}
                        className="h-12 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800/90 px-3 outline-none"
                      >
                        <option value="open">{lang?.chat_join_open || 'Свободный вход'}</option>
                        <option value="request">{lang?.chat_join_request || 'По заявке'}</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm text-zinc-300">
                      <span>{lang?.chat_community || 'Сообщество'}</span>
                      <select
                        value={communityId}
                        onChange={(event) => setCommunityId(event.target.value)}
                        className="h-12 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800/90 px-3 outline-none"
                      >
                        <option value="">{lang?.chat_without_community || 'Без привязки к сообществу'}</option>
                        {managedCommunities.map((community) => (
                          <option key={community.id} value={community.id}>{community.name}</option>
                        ))}
                      </select>
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder={lang?.chat_description_placeholder || 'Коротко опишите тему чата'}
                      className="resize-none rounded-3xl border border-zinc-600/30 bg-zinc-800/90 p-3 text-sm outline-none placeholder:text-zinc-600"
                    />
                  </>
                ) : null}

                <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300">
                  <span>{lang?.chat_voice_enabled || 'Групповые звонки'}</span>
                  <span className="flex h-6 items-center">
                    <span className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={voiceEnabled}
                        onChange={(event) => setVoiceEnabled(event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="group h-6 w-10 rounded-full bg-zinc-800 duration-300 after:absolute after:left-0 after:top-0 after:flex after:h-6 after:w-6 after:items-center after:justify-center after:rounded-full after:bg-red-500 after:duration-300 peer-checked:after:translate-x-4 peer-checked:after:bg-green-500 peer-hover:after:scale-105" />
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => void saveCommunitySettings()}
                  disabled={loadingAction}
                  className="w-full cursor-pointer rounded-3xl border border-zinc-600/30 bg-purple-600 p-3 text-sm text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50"
                >
                  {loadingAction ? (lang?.saving || 'Сохранение...') : (lang?.save || 'Сохранить')}
                </button>
              </>
            ) : null}

            {canManageJoinRequests ? <div className="flex flex-col gap-1.5">
              <span className="text-sm text-zinc-300">{lang?.chat_join_requests || 'Заявки на вступление'}</span>
              {joinRequests.length ? joinRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800 p-1.5">
                  <img
                    src={normalizeAssetUrl(request.img, FALLBACK_AVATAR)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{`${request.fname || ''} ${request.lname || ''}`.trim() || request.username}</span>
                    {request.message ? <span className="truncate text-xs text-zinc-400">{request.message}</span> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void moderateJoinRequest(request.id, 'approve')}
                    disabled={loadingAction}
                    aria-label={lang?.approve || 'Одобрить'}
                    className="h-9 w-9 cursor-pointer rounded-full bg-emerald-600 text-lg duration-300 active:scale-95 disabled:opacity-50"
                  >✓</button>
                  <button
                    type="button"
                    onClick={() => void moderateJoinRequest(request.id, 'reject')}
                    disabled={loadingAction}
                    aria-label={lang?.decline || 'Отклонить'}
                    className="h-9 w-9 cursor-pointer rounded-full bg-red-600 text-lg duration-300 active:scale-95 disabled:opacity-50"
                  >×</button>
                </div>
              )) : (
                <span className="rounded-3xl border border-zinc-600/30 bg-zinc-800 p-3 text-xs text-zinc-400">
                  {lang?.chat_join_requests_empty || 'Новых заявок нет'}
                </span>
              )}
            </div> : null}
          </div>
        )}

        {/* --- VIEW 3: ДОБАВЛЕНИЕ УЧАСТНИКОВ --- */}
        {view === 'add_members' && (
          <div className="flex flex-col gap-3">

            <div className="z-[30] -mx-3 px-3 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent">
              <div className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 z-[11]">
                <input
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
                  type="text"
                  placeholder={lang?.search_friends_placeholder || 'Поиск среди друзей...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700"
                >
                  <svg className="inline w-8 h-8 fill-white"><use href="#IC-search"></use></svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col max-h-96 overflow-y-auto -mb-10 pb-8 -mt-8 pt-8 -mx-3">
              {loadingFriends ? (
                <span className="text-xs text-zinc-400 p-3 text-center">{lang?.loading_friends || 'Загрузка друзей...'}</span>
              ) : filteredFriends.length === 0 ? (
                <span className="text-xs text-zinc-400 p-3 text-center">{lang?.friends_not_found || 'Друзья не найдены'}</span>
              ) : (
                filteredFriends.map((friend) => {
                  const isSel = selectedAddUserIds.has(friend.id);
                  const userObj = {
                    id: friend.id,
                    username: friend.username,
                    fname: friend.fname || friend.name || friend.username || (lang?.user_fallback || 'Пользователь'),
                    lname: friend.lname || '',
                    img: friend.img,
                    verify: friend.verify,
                  };

                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleSelectAddUser(friend.id)}
                      className={`active:scale-95 cursor-pointer flex items-center justify-between px-3 py-1.5 hover:rounded-3xl shrink-0 duration-300 ${isSel ? 'bg-purple-500/10' : 'hover:bg-zinc-800/40'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={normalizeAssetUrl(friend.img, FALLBACK_AVATAR)}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <AccountName user={userObj} nameClassName="text-sm font-medium text-white truncate" />
                          {friend.username && (
                            <span className="text-xs text-zinc-400 truncate">@{friend.username}</span>
                          )}
                        </div>
                      </div>
                      {isSel && (
                        <svg className="w-5 h-5 fill-purple-500 shrink-0" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="z-[30] -mx-3 px-3 bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent">
              <button
                type="button"
                onClick={handleAddMembersSubmit}
                disabled={loadingAction || !selectedAddUserIds.size}
                className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-zinc-300 text-white text-sm duration-300 active:scale-95 cursor-pointer border border-zinc-600/30 mt-1"
              >
                {loadingAction ? (lang?.adding || 'Добавление...') : `${lang?.add || 'Добавить'} (${selectedAddUserIds.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
