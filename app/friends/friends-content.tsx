"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useDragScroll } from '../hooks/useDragScroll';

interface Friend {
  id: string;
  relation_id?: string;
  is_request?: boolean;
  is_outgoing?: boolean;
  login?: string;
  username?: string;
  fname: string;
  lname: string;
  img: string;
  verify?: string | number;
  isOnline?: boolean;
  isPending?: boolean;
  isIncoming?: boolean;
  friendId?: string;
  isCurrentUser?: boolean;
}

// Рендер галки верификации
const VerifyIcon = ({ verify }: { verify?: string | number }) => {
  if (verify == 1) {
    return (
      <svg className="w-5 h-5 inline fill-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <use href="/icons.svg#IC-verify"></use>
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
      // Пытаемся достать из кеша если нет поиска
      if (!searchQuery) {
        const cached = localStorage.getItem('friends_cache');
        if (cached) {
          setFriends(JSON.parse(cached));
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoading(true);
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (token) params.append('token', token);
      if (searchQuery) params.append('q', searchQuery);

      const res = await fetch(`/api/user/friends.php?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        const fetchedFriends = data.friends || [];
        setFriends(fetchedFriends);
        
        // Кешируем только полный список
        if (!searchQuery) {
          localStorage.setItem('friends_cache', JSON.stringify(fetchedFriends));
        }

        // TODO: Здесь можно добавить логику подписки на вебсокеты как было в php
        // if (window.GlobalWS) {
        //    const userIds = fetchedFriends.map(f => parseInt(f.id)).filter(id => id > 0);
        //    GlobalWS.subscribePresence(userIds);
        // }
      } else {
        console.error(data.error);
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
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams({ token, withu: userId });
      
      const res = await fetch(`/api/messages/createdialog.php`, {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const html = await res.text();
      
      if (html === lang?.dialogcreated || html === lang?.dialogblocked) {
        // Уведомление об успешном/заблокированном создании
        alert(html); // Временно alert, можно заменить на toast/note
      } else {
        router.push(`/messages/${html}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAction = async (endpoint: string, paramName: string, id: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      
      const res = await fetch(`/api/friends/${endpoint}?${paramName}=${id}&token=${token}`);
      const text = await res.text();
      
      // Временно alert, заменить на нормальные тосты
      console.log(text);
      fetchFriends(); // Обновляем список
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || (isAuthenticated && isLoading && friends.length === 0)) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
          <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col justify-center items-center py-3 w-full">
      
      {!searchQuery ? (
        <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0">
          <span>{lang?.friends}</span>
        </span>
      ) : (
        <div className="w-full max-w-3xl">
          <span 
            onClick={() => {
              setSearchInput('');
              router.push('/friends');
            }} 
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" viewBox="0 0 48 48">
              <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
            </svg> 
            <span>{lang?.friends}</span>
          </span>
        </div>
      )}
      
      <div className="flex gap-3 items-center relative w-full max-w-3xl p-3 lg:px-0 sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[90]">
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
              <path d="M 20.5 6 C 12.509634 6 6 12.50964 6 20.5 C 6 28.49036 12.509634 35 20.5 35 C 23.956359 35 27.133709 33.779044 29.628906 31.75 L 39.439453 41.560547 A 1.50015 1.50015 0 1 0 41.560547 39.439453 L 31.75 29.628906 C 33.779044 27.133709 35 23.956357 35 20.5 C 35 12.50964 28.490366 6 20.5 6 z M 20.5 9 C 26.869047 9 32 14.130957 32 20.5 C 32 23.602612 30.776198 26.405717 28.791016 28.470703 A 1.50015 1.50015 0 0 0 28.470703 28.791016 C 26.405717 30.776199 23.602614 32 20.5 32 C 14.130953 32 9 26.869043 9 20.5 C 9 14.130957 14.130953 9 20.5 9 z" />
            </svg>
          </button>
        </form>
      </div>
      
      <div className="overflow-hidden border border-transparent lg:border-zinc-600/30 lg:bg-zinc-900 lg:rounded-3xl lg:shadow w-full max-w-3xl duration-300">
        <ul className="flex flex-col">
          {friends.length === 0 && !isLoading ? (
            <div className="w-full flex flex-col gap-0.5 justify-center items-center py-10 duration-300">
              <img src="/img/status/nothingfound.webp" className="w-48 lg:w-56" alt="Nothing found" />
              <span className="text-base text-zinc-100 w-full text-center font-black">{lang?.nofriends}</span>
              <span className="text-sm text-zinc-300 w-full text-center font-medium">{lang?.nosfriendsdesc}</span>
            </div>
          ) : (
            friends.map((friend, i) => (
              <React.Fragment key={friend.id || i}>
                <li id={`friend_${friend.id}`} className="group relative flex items-center justify-between gap-3 p-3 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95 active:rounded-3xl">
                  {friend.id === user?.id && (
                    <div className="absolute inset-x-0 w-[50%] h-[50%] left-[25%] bottom-[0%] blur-3xl rounded-full bg-gradient-to-t from-lime-500/20 to-transparent z-[-1]"></div>
                  )}
                  
                  {/* Аватарка */}
                  <Link 
                    className="flex-shrink-0 relative cursor-pointer" 
                    href={`/@${friend.username}`}
                  >
                    <img 
                      src={friend.img || '/includes/img/anlite/default_avatar.png'} 
                      loading="lazy"
                      className={`shadow w-16 h-16 rounded-full object-cover shrink-0 border ${onlineUsers[friend.id] || friend.isOnline ? 'border-lime-500' : 'border-transparent'}`}
                      alt={`${friend.fname} ${friend.lname}`} 
                    />
                  </Link>
                  
                  {/* Инфо */}
                  <Link 
                    className="flex-grow flex flex-col justify-center overflow-hidden cursor-pointer"
                    href={`/@${friend.username}`}
                  >
                    <div className="text-zinc-200 lg:text-lg font-medium cursor-pointer truncate">
                      {friend.fname} {friend.lname} <VerifyIcon verify={friend.verify} />
                    </div>
                    {friend.id === user?.id && (
                      <div className="text-sm text-lime-500 font-medium">👆 {lang?.friends_your_account || 'Это ваш аккаунт'}</div>
                    )}
                  </Link>

                  {/* Кнопки */}
                  <div className="flex gap-1.5 shrink-0">
                    {friend.isPending && friend.isIncoming && (
                      <div 
                        onClick={() => handleAction('add.php', 'frid', friend.friendId || friend.relation_id || '')}
                        className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                      >
                        <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                          <path d="M 23.976562 4.9785156 A 1.50015 1.50015 0 0 0 22.5 6.5 L 22.5 22.5 L 6.5 22.5 A 1.50015 1.50015 0 1 0 6.5 25.5 L 22.5 25.5 L 22.5 41.5 A 1.50015 1.50015 0 1 0 25.5 41.5 L 25.5 25.5 L 41.5 25.5 A 1.50015 1.50015 0 1 0 41.5 22.5 L 25.5 22.5 L 25.5 6.5 A 1.50015 1.50015 0 0 0 23.976562 4.9785156 z" />
                        </svg>
                      </div>
                    )}

                    {friend.isPending && (
                      <div 
                        onClick={() => handleAction('delete.php', 'frid', friend.friendId || friend.relation_id || '')}
                        className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                      >
                        <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                          <path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z" />
                        </svg>
                      </div>
                    )}

                    {!friend.isPending && !searchQuery ? (
                      <div 
                        onClick={() => handleCreateDialog(friend.id)}
                        className="h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer"
                      >
                        <svg className="inline w-6 h-6 fill-white" viewBox="0 0 48 48">
                          <path d="M 10.5 7 C 6.9280619 7 4 9.9280619 4 13.5 L 4 30.5 C 4 34.071938 6.9280619 37 10.5 37 L 12 37 L 12 42.5 C 12 44.46599 14.427297 45.67893 16 44.5 L 26 37 L 37.5 37 C 41.071938 37 44 34.071938 44 30.5 L 44 13.5 C 44 9.9280619 41.071938 7 37.5 7 L 10.5 7 z M 10.5 10 L 37.5 10 C 39.450062 10 41 11.549938 41 13.5 L 41 30.5 C 41 32.450062 39.450062 34 37.5 34 L 25.5 34 A 1.50015 1.50015 0 0 0 24.599609 34.300781 L 15 41.5 L 15 35.5 A 1.50015 1.50015 0 0 0 13.5 34 L 10.5 34 C 8.5499381 34 7 32.450062 7 30.5 L 7 13.5 C 7 11.549938 8.5499381 10 10.5 10 z M 17 20 C 15.895 20 15 20.895 15 22 C 15 23.105 15.895 24 17 24 C 18.105 24 19 23.105 19 22 C 19 20.895 18.105 20 17 20 z M 24 20 C 22.895 20 22 20.895 22 22 C 22 23.105 22.895 24 24 24 C 25.105 24 26 23.105 26 22 C 26 20.895 25.105 20 24 20 z M 31 20 C 29.895 20 29 20.895 29 22 C 29 23.105 29.895 24 31 24 C 32.105 24 33 23.105 33 22 C 33 20.895 32.105 20 31 20 z" />
                        </svg>
                      </div>
                    ) : null}

                  </div>
                </li>
              </React.Fragment>
            ))
          )}
        </ul>
        <div className="lg:hidden"><br/><br/><br/></div>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
       <div className="w-full flex items-center justify-center py-12">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
          <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z" />
        </svg>
      </div>
    }>
      <FriendsContent />
    </Suspense>
  );
}
