'use client';

import React, { useEffect, useState } from 'react';

import AccountName from '../../components/account-name';
import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../lib/messages-shared';


interface FriendItem {
  id: number;
  username?: string;
  fname?: string;
  lname?: string;
  name?: string;
  img?: string;
  verify?: number;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupData: { hash: string; id: number; title: string }) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { lang } = useAuth();
  const { showNote } = useNotification();

  const [title, setTitle] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setSelectedUserIds(new Set());
    setSearchQuery('');
    void fetchFriends();
  }, [isOpen]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      let list: FriendItem[] = [];
      const res = await AncialAPI.socialAction<any>('friends');
      if (Array.isArray(res)) {
        list = res;
      } else if (res?.data && Array.isArray(res.data)) {
        list = res.data;
      } else if (res?.friends && Array.isArray(res.friends)) {
        list = res.friends;
      } else if (res?.data?.friends && Array.isArray(res.data.friends)) {
        list = res.data.friends;
      }
      setFriends(list);
    } catch (err) {
      console.error('Failed to load friends for group modal', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleSelectUser = (id: number) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showNote({ content: lang?.enter_chat_name || 'Введите название беседы', type: 'error', time: 3 });
      return;
    }

    setCreating(true);
    try {
      const res = await AncialAPI.request<{
        hash: string;
        id: number;
        title: string;
      }>('/messages/CreateGroup.php', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          user_ids: Array.from(selectedUserIds),
        }),
      });

      if (res?.hash) {
        showNote({ content: lang?.group_chat_created || 'Групповой чат создан', type: 'success', time: 3 });
        onGroupCreated(res);
        onClose();
      } else {
        showNote({ content: lang?.failed_create_chat || 'Не удалось создать чат', type: 'error', time: 4 });
      }
    } catch (err: any) {
      showNote({ content: err?.message || (lang?.error_creating_group || 'Ошибка при создании группы'), type: 'error', time: 4 });
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter((f) => {
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
      title={lang?.create_group_chat || 'Создать групповой чат'}
      bodyClassName="p-3 pt-14 pb-3"
    >
      <div className="flex flex-col gap-3 text-white">

        {/* Поле названия */}
        <div className="flex flex-col w-full">
          <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 border border-zinc-600/30">
            <input
              type="text"
              placeholder={lang?.chat_name_placeholder || 'Название чата...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-3 placeholder-zinc-600 text-white"
            />
          </div>
        </div>

        {/* Поиск */}
        <div className="z-[30] -mx-3 px-3 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent">
          <div className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 z-[11]">
            <input
              className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
              type="text"
              placeholder={lang?.search_friends_placeholder || 'Поиск среди друзей...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700">
              <svg className="inline w-8 h-8 fill-white"><use href="#IC-search"></use></svg>
            </button>
          </div>
        </div>

        {/* Список друзей */}
        <div className="flex flex-col max-h-72 overflow-y-auto -mb-10 pb-8 -mt-8 pt-8 -mx-3">
          {loadingFriends ? (
            <span className="text-xs text-zinc-400 p-3 text-center">{lang?.loading_friends || 'Загрузка друзей...'}</span>
          ) : filteredFriends.length === 0 ? (
            <span className="text-xs text-zinc-400 p-3 text-center">{lang?.friends_not_found || 'Друзья не найдены'}</span>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedUserIds.has(friend.id);
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
                  onClick={() => toggleSelectUser(friend.id)}
                  className={`cursor-pointer flex items-center justify-between px-3 py-1.5 hover:rounded-3xl shrink-0 duration-300 ${
                    isSelected ? 'bg-purple-500/10' : 'hover:bg-zinc-800/40'
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
                  {isSelected && (
                    <svg className="w-5 h-5 fill-purple-500 shrink-0" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Кнопка создания */}
        <div className="z-[30] -mx-3 px-3 bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 text-white text-sm duration-300 active:scale-95 cursor-pointer shadow-lg disabled:bg-purple-800 disabled:text-zinc-300 border border-zinc-600/30"
          >
            {creating ? (lang?.creating || 'Создание...') : `${lang?.create_chat || 'Создать беседу'}${selectedUserIds.size ? ` (${selectedUserIds.size})` : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
