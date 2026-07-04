"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useDragScroll } from '../hooks/useDragScroll';
import { AncialAPI } from '../lib/api-v2';

interface Friend {
  id: string | number;
  relation_id?: string | number;
  is_request?: boolean;
  is_outgoing?: boolean;
  login?: string;
  username?: string;
  name?: string;
  fname?: string;
  lname?: string;
  img?: string;
  verify?: string | number;
  online?: boolean;
  isOnline?: boolean;
  status?: number;
  isPending?: boolean;
  is_incoming?: boolean;
  isIncoming?: boolean;
  friendId?: string | number;
  isCurrentUser?: boolean;
}

// Рендер галки верификации
const VerifyIcon = ({ verify }: { verify?: string | number }) => {
  if (verify == 1) {
    return (
      <svg className="w-5 h-5 inline fill-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <use href="#IC-verify"></use>
      </svg>
    );
  }
  return null;
};

// Отдельный компонент для контента, чтобы использовать useSearchParams безопасно
function FriendsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Для отслеживания онлайна
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/friends');
    }
  }, [isAuthenticated, authLoading, router]);

  // Обновляем query в роутере при сабмите
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) {
      router.push(`/friends?q=${encodeURIComponent(searchInput)}`);
      setSearchQuery(searchInput);
    } else {
      router.push(`/friends`);
      setSearchQuery('');
    }
  };

  // Синхронизируем стейт если сменился URL
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchInput(q);
    setSearchQuery(q);
  }, [searchParams]);

  const fetchFriends = useCallback(async () => {
    try {
      if (!searchQuery) {
        const cached = localStorage.getItem('friends_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setFriends(Array.isArray(parsed) ? parsed : []);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoading(true);
      }

      const response = await AncialAPI.socialAction<any>('friends', searchQuery);
      const fetchedFriends = Array.isArray(response) ? response : (response?.friends || response?.data || []);

      setFriends(fetchedFriends);

      if (!searchQuery && fetchedFriends.length > 0) {
        localStorage.setItem('friends_cache', JSON.stringify(fetchedFriends));
      }

    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
    }
  }, [isAuthenticated, fetchFriends]);

  const handleCreateDialog = async (userId: string) => {
    try {
      const response = await AncialAPI.createDialog<{ hash?: string, message?: string }>(userId);

      if (response.hash) {
        router.push(`/messages/${response.hash}`);
      } else if (response.message) {
        alert(response.message);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Error occurred');
    }
  };

  const handleAction = async (endpoint: string, paramName: string, id: string) => {
    try {
      const actionMap: Record<string, 'create' | 'add' | 'delete' | 'cancel'> = {
        'add.php': 'add',
        'delete.php': 'delete'
      };
      const action = actionMap[endpoint] || 'add';

      const response = await AncialAPI.friendAction<{ message?: string }>(action, id);
      console.log(response.message || response);
      fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || (isAuthenticated && isLoading && friends.length === 0)) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col justify-center items-center py-3 w-full">

      {!searchQuery ? (
        <span className="w-full max-w-3xl text-3xl font-extralight px-3 md:px-0">
          <span>{lang?.friends}</span>
        </span>
      ) : (
        <div className="w-full max-w-3xl">
          <span
            onClick={() => {
              setSearchInput('');
              router.push('/friends');
            }}
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 md:px-0 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            <span>{lang?.friends}</span>
          </span>
        </div>
      )}

      <div className="flex gap-3 items-center relative w-full max-w-3xl p-3 md:px-0 sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[90]">
        <form onSubmit={handleSearch} className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 z-[11]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
            placeholder={lang?.friends_search || 'Поиск друзей...'}
            autoComplete="off"
          />
          <button type="submit" className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700/50 border border-transparent hover:border-zinc-600/30">
            <svg className="inline w-8 h-8 fill-white" viewBox="0 0 48 48">
              <use href="#IC-search"></use>
            </svg>
          </button>
        </form>
      </div>

      <div className="flex flex-col overflow-hidden border border-transparent md:border-zinc-600/30 md:bg-zinc-900 md:rounded-3xl md:shadow w-full max-w-3xl duration-300">
        {isLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <svg className="w-16 h-16 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
              <use href="#IC-loader"></use>
            </svg>
          </div>
        ) : friends.length === 0 ? (
          <div className="w-full flex flex-col gap-0.5 justify-center items-center py-10 duration-300">
            <img src="/img/status/nothingfound.webp" className="w-48 lg:w-56" alt="Nothing found" />
            <span className="text-base text-zinc-100 w-full text-center font-black">{lang?.nofriends}</span>
            <span className="text-sm text-zinc-300 w-full text-center font-medium">{lang?.nosfriendsdesc}</span>
          </div>
        ) : (
          friends.map((friend, i) => {
              const friendName = friend.name || `${friend.fname || ''} ${friend.lname || ''}`.trim() || (lang?.anonymous || 'Аноним');
              const isOnline = onlineUsers[friend.id] || friend.online || friend.isOnline;
              const isPending = friend.status === 0 || friend.isPending || friend.is_request;
              const isIncoming = friend.is_incoming || friend.isIncoming;
              const actionId = friend.id || friend.friendId || friend.relation_id || '';

              return (
                <React.Fragment key={friend.id || i}>
                  <div id={`friend_${friend.id}`} className="group relative flex items-center justify-between gap-3 p-3 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95 active:rounded-3xl">
                    {friend.id === user?.id && (
                      <div className="absolute inset-x-0 w-[50%] h-[50%] left-[25%] bottom-[0%] blur-3xl rounded-full bg-gradient-to-t from-lime-500/20 to-transparent z-[-1]"></div>
                    )}

                    {/* Аватарка */}
                    <Link
                      className="flex-shrink-0 relative cursor-pointer"
                      href={`/@${friend.username || friend.login || friend.id}`}
                    >
                      <div
                        className={`shadow w-16 h-16 rounded-full shrink-0 bg-cover bg-center border ${isOnline ? 'border-lime-500' : 'border-transparent'}`}
                        style={{ backgroundImage: `url(${friend.img || '/includes/img/anlite/default_avatar.png'})` }}
                      ></div>
                    </Link>

                    {/* Инфо */}
                    <Link
                      className="flex-grow flex flex-col justify-center overflow-hidden cursor-pointer"
                      href={`/@${friend.username || friend.login || friend.id}`}
                    >
                      <div className="text-zinc-200 lg:text-lg font-medium cursor-pointer truncate">
                        {friendName} <VerifyIcon verify={friend.verify} />
                      </div>
                      {friend.id === user?.id && (
                        <div className="text-sm text-lime-500 font-medium">👆 {lang?.friends_your_account || 'Это ваш аккаунт'}</div>
                      )}
                    </Link>

                    {/* Кнопки */}
                    <div className="flex gap-1.5 shrink-0">
                      {isPending && isIncoming && (
                        <div
                          onClick={() => handleAction('add.php', 'frid', String(actionId))}
                          className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                        >
                          <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                            <use href="#IC-plus"></use>
                          </svg>
                        </div>
                      )}

                      {isPending && (
                        <div
                          onClick={() => handleAction('delete.php', 'frid', String(actionId))}
                          className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                        >
                          <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                            <use href="#IC-times"></use>
                          </svg>
                        </div>
                      )}

                      {!isPending && !searchQuery ? (
                        <div
                          onClick={() => handleCreateDialog(String(friend.id))}
                          className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                        >
                          <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                            <use href="#IC-chats"></use>
                          </svg>
                        </div>
                      ) : null}

                    </div>
                  </div>
                </React.Fragment>
              );
            })
        )}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center py-12">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    }>
      <FriendsContent />
    </Suspense>
  );
}
