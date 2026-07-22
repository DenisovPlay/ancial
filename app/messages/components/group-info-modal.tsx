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
  onGroupUpdated: () => void;
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
}: GroupInfoModalProps) {
  const { lang, user } = useAuth();
  const { showNote } = useNotification();

  const [view, setView] = useState<ModalView>('main');
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [editTitle, setEditTitle] = useState(title);
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
      setInviteCode(initialInviteCode);
      setSelectedAddUserIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen, title, initialInviteCode]);

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
      showNote({ content: 'Не удалось загрузить список друзей', type: 'error', time: 3 });
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
      showNote({ content: res?.message || 'Участники добавлены', type: 'success', time: 3 });
      setView('main');
      setSelectedAddUserIds(new Set());
      onGroupUpdated();
    } catch (err: any) {
      showNote({ content: err?.message || 'Ошибка добавления участников', type: 'error', time: 4 });
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
      showNote({ content: 'Ссылка-приглашение скопирована в буфер обмена', type: 'success', time: 3 });
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
        showNote({ content: 'Ссылка-приглашение сброшена', type: 'success', time: 3 });
        onGroupUpdated();
      } else {
        showNote({ content: 'Не удалось сбросить ссылку', type: 'error', time: 4 });
      }
    } catch (err: any) {
      showNote({ content: err?.message || 'Ошибка сети', type: 'error', time: 4 });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    showNote({ content: 'Загрузка аватарки...', type: 'info', time: 3 });

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
        throw new Error('Ошибка загрузки фото');
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

      showNote({ content: 'Аватарка группы обновлена', type: 'success', time: 3 });
      onGroupUpdated();
    } catch (err: any) {
      showNote({ content: err?.message || 'Ошибка загрузки изображения', type: 'error', time: 3 });
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
          avatar: avatar,
        }),
      });

      showNote({ content: 'Название группы обновлено', type: 'success', time: 3 });
      setView('main');
      onGroupUpdated();
    } catch (err: any) {
      showNote({ content: err?.message || 'Не удалось обновить название', type: 'error', time: 4 });
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

      showNote({ content: 'Участник удален из чата', type: 'success', time: 3 });
      onGroupUpdated();
    } catch (err: any) {
      showNote({ content: err?.message || 'Не удалось удалить участника', type: 'error', time: 4 });
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

      showNote({ content: 'Вы вышли из беседы', type: 'info', time: 3 });
      onGroupUpdated();
      onClose();
    } catch (err: any) {
      showNote({ content: err?.message || 'Не удалось выйти из чата', type: 'error', time: 4 });
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        view === 'add_members'
          ? 'Добавление участников'
          : view === 'edit_title'
            ? 'Название группы'
            : lang?.group_info || 'Информация о чате'
      }
      bodyClassName="p-3 pt-14 pb-3"
    >
      <div className="flex flex-col gap-3 text-white">
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
            <span>Назад</span>
          </button>
        )}

        {/* --- VIEW 1: ГЛАВНЫЙ ЭКРАН СВОЙСТВ --- */}
        {view === 'main' && (
          <>
            {/* Единая шапка группы */}
            <div className="flex flex-col items-center gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              <div
                className={`relative group shrink-0 ${isAdminOrOwner ? 'cursor-pointer' : ''}`}
                onClick={() => isAdminOrOwner && avatarInputRef.current?.click()}
                title={isAdminOrOwner ? 'Сменить аватарку группы' : undefined}
              >
                <img
                  src={normalizeAssetUrl(avatar, FALLBACK_AVATAR)}
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

              <div className="flex flex-col items-center gap-1 text-center w-full">
                <div className="flex items-center justify-center gap-2 max-w-full">
                  <span className="text-xl font-bold truncate">{title}</span>
                  {isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditTitle(title);
                        setView('edit_title');
                      }}
                      className="p-1 text-zinc-400 hover:text-purple-400 duration-300 cursor-pointer active:scale-95 shrink-0"
                      title="Изменить название"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                  )}
                </div>

                <span className="text-xs text-zinc-400">
                  {members.length} {members.length === 1 ? 'участник' : members.length > 1 && members.length < 5 ? 'участника' : 'участников'}
                </span>
              </div>
            </div>

            {/* Ссылка-приглашение */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-300">Ссылка-приглашение</span>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 p-2.5 bg-zinc-800/80 border border-zinc-600/30 rounded-3xl text-xs text-zinc-300 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="p-2.5 px-4 bg-purple-600 hover:bg-purple-500 rounded-3xl text-xs font-bold duration-300 active:scale-95 cursor-pointer shrink-0"
                >
                  Копировать
                </button>
              </div>
              {isAdminOrOwner && (
                <button
                  type="button"
                  onClick={handleResetInviteCode}
                  disabled={loadingAction}
                  className="self-start text-[11px] text-zinc-400 hover:text-red-400 duration-300 cursor-pointer active:scale-95 mt-1"
                >
                  Сбросить инвайт-ссылку
                </button>
              )}
            </div>

            {/* Список участников */}
            <div className="flex flex-col gap-2">
              <div className="z-[30] flex items-center justify-between bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent">
                <span className="text-xs font-bold text-zinc-300">Участники ({members.length})</span>
                {isAdminOrOwner && (
                  <button
                    type="button"
                    onClick={handleOpenAddMembers}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer active:scale-95 duration-300"
                  >
                    + Добавить
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto -mb-8 pb-8 -mt-5 pt-5">
                {members.map((member) => {
                  const userObj = {
                    id: member.id,
                    username: member.username,
                    fname: member.fname || member.name || member.username || 'Пользователь',
                    lname: member.lname || '',
                    img: member.img,
                    verify: member.verify,
                  };

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 rounded-3xl bg-zinc-800/40 border border-zinc-600/30 shrink-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={normalizeAssetUrl(member.img, FALLBACK_AVATAR)}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <AccountName user={userObj} nameClassName="text-sm font-medium text-white truncate" />
                          <span className="text-[10px] text-purple-400">
                            {member.role === 'owner' ? 'Создатель' : member.role === 'admin' ? 'Администратор' : 'Участник'}
                          </span>
                        </div>
                      </div>

                      {isAdminOrOwner && member.id !== currentUserId && member.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={loadingAction}
                          className="p-1.5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-full duration-300 active:scale-95 cursor-pointer shrink-0"
                          title="Исключить из группы"
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

            {/* Покинуть группу */}
            <button
              type="button"
              onClick={handleLeaveGroup}
              disabled={loadingAction}
              className="z-[30] w-full p-3 rounded-3xl bg-red-800 hover:bg-red-700 border border-zinc-600/30 font-bold text-red-400 duration-300 active:scale-95 cursor-pointer mt-1"
            >
              Покинуть чат
            </button>
          </>
        )}

        {/* --- VIEW 2: ИЗМЕНЕНИЕ НАЗВАНИЯ --- */}
        {view === 'edit_title' && (
          <div className="flex flex-col gap-3">
            <label className="text-xs text-zinc-400 font-medium">Новое название чата</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Например: Проект Ancial"
              className="w-full p-3 bg-zinc-800 border border-zinc-600/30 rounded-3xl text-sm text-white focus:outline-none focus:border-purple-500 duration-300"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={loadingAction || !editTitle.trim()}
              className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-sm duration-300 active:scale-95 cursor-pointer border border-zinc-600/30 mt-1"
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}

        {/* --- VIEW 3: ДОБАВЛЕНИЕ УЧАСТНИКОВ --- */}
        {view === 'add_members' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">Выберите друзей для добавления</label>
              <span className="text-xs text-purple-400 font-semibold">
                Выбрано: {selectedAddUserIds.size}
              </span>
            </div>

            <input
              type="text"
              placeholder="Поиск среди друзей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="z-[30] w-full p-3 bg-zinc-800 border border-zinc-600/30 rounded-3xl text-xs text-white focus:outline-none duration-300"
            />

            <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto -my-8 py-8">
              {loadingFriends ? (
                <span className="text-xs text-zinc-400 p-3 text-center">Загрузка друзей...</span>
              ) : filteredFriends.length === 0 ? (
                <span className="text-xs text-zinc-400 p-3 text-center">Друзья не найдены</span>
              ) : (
                filteredFriends.map((friend) => {
                  const isSel = selectedAddUserIds.has(friend.id);
                  const userObj = {
                    id: friend.id,
                    username: friend.username,
                    fname: friend.fname || friend.name || friend.username || 'Пользователь',
                    lname: friend.lname || '',
                    img: friend.img,
                    verify: friend.verify,
                  };

                  return (
                    <div
                      key={friend.id}
                      onClick={() => toggleSelectAddUser(friend.id)}
                      className={`flex items-center justify-between p-2.5 rounded-3xl border duration-300 cursor-pointer active:scale-95 ${isSel ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60'
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={normalizeAssetUrl(friend.img, FALLBACK_AVATAR)}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <AccountName user={userObj} nameClassName="text-xs font-medium text-white truncate" />
                          {friend.username && (
                            <span className="text-[10px] text-zinc-400 truncate">@{friend.username}</span>
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

            <button
              type="button"
              onClick={handleAddMembersSubmit}
              disabled={loadingAction || !selectedAddUserIds.size}
              className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-zinc-300 text-white font-bold text-sm duration-300 active:scale-95 cursor-pointer border border-zinc-600/30 mt-1"
            >
              {loadingAction ? 'Добавление...' : `Добавить выбранных (${selectedAddUserIds.size})`}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
