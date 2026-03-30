'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import YandexRtb from '../components/yandex-rtb';
import Modal from '../components/modal';

interface Group {
  id: string | number;
  slnk: string;
  img: string;
  name: string;
  verify?: string | number;
}

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

function GroupsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qQuery = searchParams.get('q') || '';
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();

  const [query, setQuery] = useState(qQuery);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearch, setIsSearch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grTitle, setGrTitle] = useState('');
  const [grDesc, setGrDesc] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/groups');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadGroups = async (searchQuery: string) => {
    try {
      // Пытаемся достать из кеша если нет поиска
      if (!searchQuery) {
        const cached = localStorage.getItem('groups_cache');
        if (cached) {
          setGroups(JSON.parse(cached));
          setIsSearch(false);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoading(true);
      }

      setErrorMsg('');
      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const token = localStorage.getItem('token');
      
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/user/groups.php?q=${encodeURIComponent(searchQuery)}${token ? `&token=${token}` : ''}`);
      const data = await res.json();

      if (data.success || Array.isArray(data.groups)) {
        const fetchedGroups = data.groups || [];
        setGroups(fetchedGroups);
        setIsSearch(data.isSearch || !!searchQuery);

        // Кешируем только полный список
        if (!searchQuery) {
          localStorage.setItem('groups_cache', JSON.stringify(fetchedGroups));
        }
      } else {
        setErrorMsg('Ошибка загрузки');
      }
    } catch (error) {
      console.error('Ошибка при загрузке сообществ:', error);
      setErrorMsg('Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setQuery(qQuery);
      loadGroups(qQuery);
    }
  }, [qQuery, isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`?q=${encodeURIComponent(query)}`);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams();
      params.append('gr_title', grTitle);
      params.append('gr_desc', grDesc);
      
      const token = localStorage.getItem('token');
      if (token) {
        params.append('token', token);
      }

      const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${NEXT_PUBLIC_API_URL}/api/group/create.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      const textResponse = await res.text();
      
      if (textResponse === "Сообщество создано!" || textResponse.includes('успешно') || textResponse.includes('"success":true')) {
        setGrTitle('');
        setGrDesc('');
        setIsModalOpen(false);
        loadGroups(query);
      } else {
        console.error('Ошибка создания:', textResponse);
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="p-3 text-center text-zinc-400">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col justify-center items-center py-3">
      {!qQuery ? (
        <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0">
          <span>{lang?.groups || 'Сообщества'}</span>
        </span>
      ) : (
        <div className="w-full max-w-3xl px-3 lg:px-0">
          <span 
            onClick={() => {
              setQuery('');
              router.push('/groups');
            }} 
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z"></path></svg> 
            <span>{lang?.groups || 'Сообщества'}</span>
          </span>
        </div>
      )}

      <div className="flex gap-3 items-center relative w-full max-w-3xl p-3 lg:px-0 sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
        <form onSubmit={handleSearch} className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12 z-[11]">
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white" 
            placeholder={lang?.groups_search || 'Поиск...'} 
            autoComplete="off" 
          />
          <button type="submit" className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700">
            <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 20.5 6 C 12.509634 6 6 12.50964 6 20.5 C 6 28.49036 12.509634 35 20.5 35 C 23.956359 35 27.133709 33.779044 29.628906 31.75 L 39.439453 41.560547 A 1.50015 1.50015 0 1 0 41.560547 39.439453 L 31.75 29.628906 C 33.779044 27.133709 35 23.956357 35 20.5 C 35 12.50964 28.490366 6 20.5 6 z M 20.5 9 C 26.869047 9 32 14.130957 32 20.5 C 32 23.602612 30.776198 26.405717 28.791016 28.470703 A 1.50015 1.50015 0 0 0 28.470703 28.791016 C 26.405717 30.776199 23.602614 32 20.5 32 C 14.130953 32 9 26.869043 9 20.5 C 9 14.130957 14.130953 9 20.5 9 z"></path></svg>
          </button>
        </form>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full"
        >
          <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 23.976562 4.9785156 A 1.50015 1.50015 0 0 0 22.5 6.5 L 22.5 22.5 L 6.5 22.5 A 1.50015 1.50015 0 1 0 6.5 25.5 L 22.5 25.5 L 22.5 41.5 A 1.50015 1.50015 0 1 0 25.5 41.5 L 25.5 25.5 L 41.5 25.5 A 1.50015 1.50015 0 1 0 41.5 22.5 L 25.5 22.5 L 25.5 6.5 A 1.50015 1.50015 0 0 0 23.976562 4.9785156 z"></path></svg>
        </button>
      </div>

      <div className="overflow-hidden border border-transparent lg:border-zinc-600/30 lg:bg-zinc-900 lg:rounded-3xl lg:shadow text-content-700 w-full max-w-3xl duration-300">
        {isLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path></svg>
          </div>
        ) : errorMsg ? (
          <div className="p-3 text-center text-zinc-400">{errorMsg}</div>
        ) : groups.length === 0 ? (
          <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center pb-3">
            <img src="/img/status/nothingfound.webp" className="h-56" alt="Not found" />
            <span className="text-base text-zinc-100 w-full text-center font-black">{lang?.nogroups || 'Нет сообществ'}</span>
            <span className="text-sm text-zinc-300 w-full text-center font-medium">
              {isSearch ? (lang?.nosgroupsdesc || 'Ничего не найдено') : (lang?.nogroupsdesc || 'Вы еще никуда не подписались')}
            </span>
          </div>
        ) : (
          groups.map((group, index) => (
            <React.Fragment key={group.id || index}>
              {index === 3 && <YandexRtb blockId="R-A-3636730-16" />}
              <div 
                onClick={() => router.push(`/$${group.slnk}`)}
                className="relative flex p-3 flex-grow hover:bg-zinc-800 duration-300 justify-center gap-3 cursor-pointer active:scale-95 active:rounded-3xl"
              >
                <div 
                  className="cursor-pointer shadow w-16 h-16 rounded-full shrink-0 bg-cover bg-center" 
                  style={{ backgroundImage: `url(${group.img})` }}
                ></div>
                <div className="flex flex-col flex-grow justify-center">
                  <span className="text-zinc-200 lg:text-lg font-medium cursor-pointer">
                    {group.name} <VerifyIcon verify={group.verify} />
                  </span>
                </div>
              </div>
            </React.Fragment>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={lang?.new_group || 'Новое сообщество'}>
        <form onSubmit={handleCreateGroup} className="text-content-700 flex flex-col gap-3">
          <input 
            value={grTitle} 
            onChange={(e) => setGrTitle(e.target.value)} 
            type="text" 
            placeholder={lang?.group_name || 'Название сообщества'} 
            className="bg-zinc-800 p-2 text-zinc-100 placeholder-zinc-500 rounded-3xl h-12 outline-none border border-transparent focus:border-zinc-600 transition-colors border-zinc-600/30"
            required 
          />
          <input 
            value={grDesc} 
            onChange={(e) => setGrDesc(e.target.value)} 
            type="text" 
            placeholder={lang?.description || 'Описание'} 
            className="bg-zinc-800 p-2 text-zinc-100 placeholder-zinc-500 rounded-3xl h-12 outline-none border border-transparent focus:border-zinc-600 transition-colors border-zinc-600/30"
            required 
          />
          <button 
            type="submit" 
            className="cursor-pointer w-full rounded-3xl flex items-center justify-center bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 px-3 py-2 text-white font-medium h-12 border border-zinc-600/30"
          >
            {lang?.create || 'Создать'}
          </button> 
        </form> 
      </Modal>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center py-12">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path></svg>
      </div>
    }>
      <GroupsContent />
    </Suspense>
  );
}
