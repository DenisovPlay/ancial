"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

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
        <path d="M 19.117188 5.0097656 C 17.966069 5.0248122 16.843416 5.649605 16.279297 6.7402344 L 14.910156 9.3867188 C 14.870216 9.4640098 14.795234 9.5079874 14.707031 9.5039062 L 11.730469 9.3671875 L 11.728516 9.3671875 C 9.8600154 9.2815038 8.2783586 10.861716 8.3652344 12.730469 L 8.5039062 15.707031 C 8.5080763 15.797231 8.4651861 15.871559 8.3867188 15.912109 L 5.7402344 17.279297 A 1.50015 1.50015 0 0 0 5.7382812 17.279297 C 4.0775961 18.139227 3.4980775 20.29937 4.5078125 21.875 L 6.1152344 24.382812 C 6.1632214 24.457712 6.1632214 24.544244 6.1152344 24.619141 L 4.5078125 27.126953 C 3.4985264 28.701883 4.0763699 30.863047 5.7382812 31.722656 A 1.50015 1.50015 0 0 0 5.7402344 31.722656 L 8.3867188 33.089844 C 8.4640098 33.129784 8.5079873 33.206719 8.5039062 33.294922 L 8.3652344 36.271484 C 8.2783274 38.140905 9.8610476 39.721672 11.730469 39.634766 L 14.707031 39.498047 C 14.797231 39.493847 14.869606 39.536767 14.910156 39.615234 L 16.279297 42.261719 A 1.50015 1.50015 0 0 0 16.279297 42.263672 C 17.139227 43.924354 19.297416 44.501922 20.873047 43.492188 L 23.382812 41.884766 C 23.457712 41.836776 23.542291 41.836776 23.617188 41.884766 L 26.126953 43.492188 C 27.701883 44.501474 29.861094 43.92363 30.720703 42.261719 L 32.089844 39.615234 C 32.129784 39.537944 32.204766 39.493966 32.292969 39.498047 L 35.271484 39.634766 C 37.140031 39.720446 38.721641 38.140237 38.634766 36.271484 L 38.496094 33.294922 C 38.491894 33.204722 38.534814 33.130394 38.613281 33.089844 L 41.259766 31.722656 A 1.50015 1.50015 0 0 0 41.261719 31.722656 C 42.922401 30.862726 43.501922 28.702584 42.492188 27.126953 L 40.884766 24.619141 C 40.836776 24.544241 40.836776 24.457709 40.884766 24.382812 L 42.492188 21.875 C 43.501474 20.30007 42.92363 18.138906 41.261719 17.279297 A 1.50015 1.50015 0 0 0 41.259766 17.279297 L 38.613281 15.912109 C 38.535991 15.872169 38.492013 15.795234 38.496094 15.707031 L 38.634766 12.730469 C 38.721636 10.861716 37.140031 9.2815038 35.271484 9.3671875 L 35.269531 9.3671875 L 32.292969 9.5039062 C 32.202769 9.5080763 32.130394 9.4651861 32.089844 9.3867188 L 30.720703 6.7402344 C 29.860773 5.0795523 27.702584 4.5000306 26.126953 5.5097656 L 23.617188 7.1171875 C 23.542288 7.1651745 23.45771 7.1651745 23.382812 7.1171875 L 20.873047 5.5097656 C 20.479314 5.2574441 20.048746 5.1027764 19.611328 5.0410156 C 19.447297 5.0178554 19.281633 5.0076161 19.117188 5.0097656 z M 19.076172 7.9941406 C 19.128876 7.9803047 19.189371 7.9937992 19.253906 8.0351562 L 21.763672 9.6425781 C 22.818775 10.318591 24.181225 10.318591 25.236328 9.6425781 L 27.746094 8.0351562 C 27.874463 7.9528913 27.986571 7.9838236 28.056641 8.1191406 L 29.423828 10.765625 C 29.999525 11.878386 31.180326 12.559763 32.431641 12.501953 L 35.410156 12.363281 C 35.562735 12.356181 35.643812 12.439221 35.636719 12.591797 L 35.5 15.568359 C 35.44208 16.820157 36.121619 18.000114 37.236328 18.576172 L 39.882812 19.945312 C 40.016877 20.015773 40.049034 20.127542 39.966797 20.255859 L 38.357422 22.763672 A 1.50015 1.50015 0 0 0 38.357422 22.765625 C 37.681409 23.820728 37.681409 25.181225 38.357422 26.236328 A 1.50015 1.50015 0 0 0 38.357422 26.238281 L 39.966797 28.746094 C 40.048587 28.873715 40.016122 28.98648 39.882812 29.056641 L 37.236328 30.425781 C 36.122795 31.001231 35.442167 32.181791 35.5 33.433594 L 35.636719 36.410156 C 35.643819 36.562735 35.562739 36.645765 35.410156 36.638672 L 32.431641 36.5 C 31.179843 36.44208 29.999886 37.123572 29.423828 38.238281 L 28.056641 40.884766 C 27.986251 41.020854 27.875164 41.049512 27.746094 40.966797 L 25.236328 39.359375 C 24.181225 38.683362 22.818775 38.683362 21.763672 39.359375 L 19.253906 40.966797 C 19.125537 41.049057 19.013429 41.018122 18.943359 40.882812 L 17.576172 38.238281 C 17.000722 37.124749 15.820162 36.442167 14.568359 36.5 L 11.589844 36.638672 C 11.437265 36.645772 11.356188 36.562732 11.363281 36.410156 L 11.5 33.433594 C 11.55792 32.181796 10.878381 31.001839 9.7636719 30.425781 L 7.1171875 29.056641 C 6.9831238 28.98618 6.9509714 28.874411 7.0332031 28.746094 L 8.6425781 26.238281 A 1.50015 1.50015 0 0 0 8.6425781 26.236328 C 9.3185911 25.181225 9.3185911 23.820728 8.6425781 22.765625 A 1.50015 1.50015 0 0 0 8.6425781 22.763672 L 7.0332031 20.255859 C 6.9514181 20.128238 6.9838705 20.015473 7.1171875 19.945312 L 9.7636719 18.576172 C 10.877205 18.000816 11.557833 16.820162 11.5 15.568359 L 11.363281 12.591797 C 11.356181 12.439218 11.437261 12.356188 11.589844 12.363281 L 14.568359 12.501953 C 15.819669 12.559853 16.999868 11.879561 17.576172 10.765625 L 17.576172 10.763672 L 18.943359 8.1171875 C 18.978554 8.0491432 19.023468 8.0079766 19.076172 7.9941406 z M 31.28125 17.988281 A 1.50015 1.50015 0 0 0 30.34375 18.289062 C 27.039034 20.710403 24.034498 23.748337 21.240234 27.203125 C 19.921503 25.633951 18.557285 24.247502 17.060547 23.251953 A 1.50015 1.50015 0 1 0 15.398438 25.748047 C 16.957756 26.785221 18.498201 28.340758 20.025391 30.394531 A 1.50015 1.50015 0 0 0 22.425781 30.404297 C 25.375009 26.507068 28.605658 23.283807 32.117188 20.710938 A 1.50015 1.50015 0 0 0 31.28125 17.988281 z" />
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

      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/user/friends.php?${params.toString()}`);
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
      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams({ token, withu: userId });
      
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/messages/createdialog.php`, {
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
      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/friends/${endpoint}?${paramName}=${id}&token=${token}`);
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
                  <div 
                    className="flex-shrink-0 relative cursor-pointer" 
                    onClick={() => router.push(`/@${friend.username || friend.login}`)}
                  >
                    <img 
                      src={friend.img || '/includes/img/anlite/default_avatar.png'} 
                      loading="lazy"
                      className={`shadow w-16 h-16 rounded-full object-cover shrink-0 ${onlineUsers[friend.id] || friend.isOnline ? 'ring ring-lime-500 ring-offset-2 ring-offset-black' : ''}`}
                      alt={`${friend.fname} ${friend.lname}`} 
                    />
                  </div>
                  
                  {/* Инфо */}
                  <div 
                    className="flex-grow flex flex-col justify-center overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/@${friend.username || friend.login}`)}
                  >
                    <div className="text-zinc-200 lg:text-lg font-medium cursor-pointer truncate">
                      {friend.fname} {friend.lname} <VerifyIcon verify={friend.verify} />
                    </div>
                    {friend.id === user?.id && (
                      <div className="text-sm text-lime-500 font-medium">👆 {lang?.friends_your_account || 'Это ваш аккаунт'}</div>
                    )}
                  </div>

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
