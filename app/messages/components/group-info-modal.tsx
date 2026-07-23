'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/modal';
import AccountName from '../../components/account-name';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { FALLBACK_AVATAR, IMGBB_API_KEY, normalizeAssetUrl } from '../lib/messages-shared';

interface GroupMember {
  id: number;
  username?: string;
  fname?: string;
  lname?: string;
  name?: string;
  img?: string;
  verify?: number;
  role: 'owner' | 'admin' | 'member';
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  dialogId: number;
  title: string;
  avatar: string;
  inviteCode: string;
  myRole: 'owner' | 'admin' | 'member';
  members: GroupMember[];
  onGroupUpdated: (partial?: { avatar?: string; title?: string }) => void;
  onLeave?: () => void;
}

type ModalView = 'main' | 'add_members' | 'edit_title';

export default function GroupInfoModal({
  isOpen,
  onClose,
  dialogId,
  title,
  avatar,
  inviteCode: initialInviteCode,
  myRole,
  members,
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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [friendsList, setFriendsList] = useState<Array<{ id: number; username?: string; name?: string; fname?: string; lname?: string; img?: string; verify?: number }>>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedAddUserIds, setSelectedAddUserIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';
  const currentUserId = user?.id ? Number(user.id) : 0;

  useEffect(() => {
    if (isOpen) {
      setView('main');
      setEditTitle(title);
      setCurrentAvatar(avatar);
      setInviteCode(initialInviteCode);
      setSelectedAddUserIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen, title, avatar, initialInviteCode]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await AncialAPI.socialAction<any>('friends');
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.friends)
          ? res.friends
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.friends)
              ? res.data.friends
              : [];

      const memberIds = new Set(members.map((m) => m.id));
      setFriendsList(list.filter((f: any) => f?.id && !memberIds.has(Number(f.id))));
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
      showNote({ content: res?.message || (lang?.members_added || 'Участники добавлены'), type: 'success', time: 3 });
      setView('main');
      setSelectedAddUserIds(new Set());
      onGroupUpdated();
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.error_adding_members || 'Ошибка добавления участников'), type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${inviteCode || initialInviteCode}`
    : `https://ancial.ru/invite/${inviteCode || initialInviteCode}`;

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
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.somethingwrong || 'Произошла ошибка =('), type: 'error', time: 4 });
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
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      const imageUrl = data?.data?.url;

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
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.error_uploading_image || 'Ошибка загрузки изображения'), type: 'error', time: 3 });
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
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
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.failed_update_group_name || 'Не удалось обновить название'), type: 'error', time: 4 });
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
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.failed_remove_member || 'Не удалось удалить участника'), type: 'error', time: 4 });
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
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.failed_leave_chat || 'Не удалось выйти из чата'), type: 'error', time: 4 });
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
                className={`relative group shrink-0 ${isAdminOrOwner ? 'cursor-pointer active:scale-95 duration-300' : ''}`}
                onClick={() => isAdminOrOwner && avatarInputRef.current?.click()}
                title={isAdminOrOwner ? (lang?.change_group_avatar || 'Сменить аватарку группы') : undefined}
              >
                <img
                  src={normalizeAssetUrl(currentAvatar || avatar, FALLBACK_AVATAR)}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-lg border border-zinc-600/30 group-hover:opacity-85 duration-300"
                />
                {isAdminOrOwner && (
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

            <div className={`grid grid-cols-${isAdminOrOwner ? 3 : 2} gap-3 w-full`}>
              <button
                type="button"
                onClick={copyInviteLink}
                className="disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-zinc-800 hover:bg-zinc-800/70 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                  <use href="#IC-plus"></use>
                </svg>
                <span className="text-sm sm:text-md">{lang?.invite || 'Пригласить'}</span>
              </button>
              {isAdminOrOwner && (
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
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={loadingAction}
                className="disabled:opacity-50 rounded-3xl p-3 gap-1.5 sm:gap-3 flex items-center justify-center bg-red-800/25 hover:bg-red-800/50 text-red-500 border border-zinc-600/30 active:scale-95 duration-300 cursor-pointer">
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
                {isAdminOrOwner && (
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

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-3 py-1.5 hover:rounded-3xl shrink-0 hover:bg-zinc-800/40 duration-300"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={normalizeAssetUrl(member.img, FALLBACK_AVATAR)}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <AccountName user={userObj} nameClassName="text-sm font-medium text-white truncate" />
                        </div>
                      </div>

                      {member.role === 'owner' && (
                        <span className="text-xs text-purple-400 bg-purple-500/25 p-1 rounded-3xl border border-zinc-600/30">
                          {lang?.role_owner || 'Создатель'}
                        </span>
                      )}

                      {isAdminOrOwner && member.id !== currentUserId && member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={loadingAction}
                          className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full duration-300 active:scale-95 cursor-pointer shrink-0"
                          title={lang?.remove_from_group || 'Исключить из группы'}
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        </button>
                      )}
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
                className={`relative group shrink-0 ${isAdminOrOwner ? 'cursor-pointer' : ''}`}
                onClick={() => isAdminOrOwner && avatarInputRef.current?.click()}
                title={isAdminOrOwner ? (lang?.change_group_avatar || 'Сменить аватарку группы') : undefined}
              >
                <img
                  src={normalizeAssetUrl(currentAvatar || avatar, FALLBACK_AVATAR)}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover shadow-lg border border-zinc-600/30 group-hover:opacity-85 duration-300"
                />
                {isAdminOrOwner && (
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
                    placeholder={lang?.eg_chat_name || 'Например: Проект Ancial'}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full items-center justify-center">
              {isAdminOrOwner && (
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
