'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import YandexRtb from '../components/yandex-rtb';
import Modal from '../components/modal';
import Link from 'next/link';

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
        <use href="/icons.svg#IC-verify"></use>
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
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/user/groups.php?q=${encodeURIComponent(searchQuery)}${token ? `&token=${token}` : ''}`);
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

      const res = await fetch(`/api/group/create.php`, {
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
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-chevron-left"></use></svg> 
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
            <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-search"></use></svg>
          </button>
        </form>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full"
        >
          <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-plus"></use></svg>
        </button>
      </div>

      <div className="overflow-hidden border border-transparent lg:border-zinc-600/30 lg:bg-zinc-900 lg:rounded-3xl lg:shadow w-full max-w-3xl duration-300">
        {isLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-loader"></use></svg>
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
              <Link 
                href={`/$${group.slnk}`}
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
              </Link>
            </React.Fragment>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={lang?.new_group || 'Новое сообщество'}>
        <form onSubmit={handleCreateGroup} className="flex flex-col gap-3">
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
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-loader"></use></svg>
      </div>
    }>
      <GroupsContent />
    </Suspense>
  );
}
