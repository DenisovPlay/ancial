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
      showNote({ content: 'Введите название беседы', type: 'error', time: 3 });
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
        showNote({ content: 'Групповой чат создан', type: 'success', time: 3 });
        onGroupCreated(res);
        onClose();
      } else {
        showNote({ content: 'Не удалось создать чат', type: 'error', time: 4 });
      }
    } catch (err: any) {
      showNote({ content: err?.message || 'Ошибка при создании группы', type: 'error', time: 4 });
    } finally {
      setCreating(false);
    }
  };

  const filteredFriends = friends.filter((f) => {
    const fullName = `${f.fname || ''} ${f.lname || ''} ${f.name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase().trim());
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.create_group_chat || 'Создать групповой чат'}
      bodyClassName="p-3 pt-14 pb-3"
    >
      <div className="flex flex-col gap-3 text-white">
        {/* Название группы */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400 font-medium">{lang?.group_name || 'Название чата'}</label>
          <input
            type="text"
            placeholder="Например: Проект Ancial"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 bg-zinc-800/80 border border-zinc-600/30 rounded-3xl text-sm focus:outline-none focus:border-purple-500 duration-300"
          />
        </div>

        {/* Выбор участников */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 font-medium">Добавить участников</label>
            <span className="text-xs text-purple-400 font-semibold">
              Выбрано: {selectedUserIds.size}
            </span>
          </div>

          <input
            type="text"
            placeholder="Поиск среди друзей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="z-[30] w-full p-2.5 bg-zinc-800 border border-zinc-600/30 rounded-3xl text-xs focus:outline-none duration-300"
          />

          <div className="z-[10] flex flex-col gap-1.5 max-h-60 overflow-y-auto -my-8 py-8">
            {loadingFriends ? (
              <span className="text-xs text-zinc-400 p-3 text-center">Загрузка друзей...</span>
            ) : filteredFriends.length === 0 ? (
              <span className="text-xs text-zinc-400 p-3 text-center">Друзья не найдены</span>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedUserIds.has(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelectUser(friend.id)}
                    className={`flex items-center justify-between p-1.5 rounded-3xl border duration-300 cursor-pointer active:scale-95 ${isSelected
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={normalizeAssetUrl(friend.img, FALLBACK_AVATAR)}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                      <AccountName
                        user={friend}
                        nameClassName="text-sm font-medium text-white"
                      />
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center duration-300 ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'
                        }`}
                    >
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Кнопка создания */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !title.trim()}
          className="z-[30] w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm duration-300 active:scale-95 cursor-pointer shadow-lg disabled:bg-purple-800 border border-zinc-600/30"
        >
          {creating ? 'Создание...' : 'Создать беседу'}
        </button>
      </div>
    </Modal>
  );
}
