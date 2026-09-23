"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AncialAPI } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';

interface Notification {
  id: string;
  content: string;
  date: string;
  type: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, langCode } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/notifications');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchNotifications = async () => {
      try {
        const parsed = cache.get<Notification[]>('notifications_cache', { category: 'notifications', subcategory: 'list' });
        if (parsed) {
          setNotifications(parsed);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        const data = await AncialAPI.getNotifications<Notification[] | { status?: string; notifications?: Notification[] }>();

        if (Array.isArray(data) || data?.status === 'success' || data?.notifications) {
          const list = Array.isArray(data) ? data : (data.notifications || []);
          setNotifications(list);
          cache.set('notifications_cache', list, { category: 'notifications', subcategory: 'list' });

          // Отмечаем уведомления прочитанными на сервере и в навигации
          try {
            void AncialAPI.markNotificationsRead().catch(() => null);
            window.dispatchEvent(new CustomEvent('ancial:unread_update', { detail: { type: 'clear_notifications' } }));
          } catch {}
        }
      } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Легаси mount-загрузка уведомлений: сеттлеры после await внутри.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const clearNotif = async () => {
    try {
      await AncialAPI.clearNotifications();
      setNotifications([]);
      cache.set('notifications_cache', [], { category: 'notifications', subcategory: 'list' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const translateContent = (text: string) => {
    if (!text) return '';
    let res = text;
    if (langCode === 'en') {
      res = res
        .replace('написал вам!', 'wrote to you!')
        .replace('хочет добавить вас в друзья', 'wants you to become friends')
        .replace('поставил вам лайк!', 'liked your post!')
        .replace('создал с вами диалог!', 'created a dialogue with you!')
        .replace('отправил фотографию', 'sent a photo')
        .replace('отправил стикер', 'sent a sticker')
        .replace('написал сообщение', 'sent a message')
        .replace('оставил комментарий к вашему посту', 'commented on your post')
        .replace('упомянул вас в комментарии', 'mentioned you in a comment')
        .replace('упомянул вас в своем посте', 'mentioned you in a post')
        .replace('звонит вам', 'is calling you');
    } else if (langCode === 'be') {
      res = res
        .replace('написал вам!', 'напісаў вам!')
        .replace('хочет добавить вас в друзья', 'хоча дадаць вас у сябры')
        .replace('поставил вам лайк!', 'паставіў вам лайк!')
        .replace('создал с вами диалог!', 'стварыў з вамі дыялог!')
        .replace('отправил фотографию', 'адправіў фатаграфію')
        .replace('отправил стикер', 'адправіў сцікер')
        .replace('написал сообщение', 'напісаў паведамленне')
        .replace('оставил комментарий к вашему посту', 'пакінуў каментарый да вашага допісу')
        .replace('упомянул вас в комментарии', 'згадаў вас у каментарыі')
        .replace('упомянул вас в своем посте', 'згадаў вас у сваім допісе')
        .replace('звонит вам', 'тэлефануе вам');
    }
    return res;
  };

  const renderIcon = (type: string | number) => {
    const t = String(type);
    if (t === '1') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-purple-500/25 fill-purple-500 shrink-0">
          <Icon name="IC-notify-message" className="w-8 h-8" />
        </div>
      );
    } else if (t === '2') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-pink-500/25 fill-pink-500 shrink-0">
          <Icon name="IC-heart" className="w-8 h-8" />
        </div>
      );
    } else if (t === '3') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-lime-500/25 fill-lime-500 shrink-0">
          <Icon name="IC-signup" className="w-8 h-8" />
        </div>
      );
    }
    return null;
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex flex-col justify-center items-center py-10 w-full">
        <span className="text-zinc-400">{lang?.['loading...'] || 'Загрузка...'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-3 py-3 w-full">
      <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0">
        <span>{lang?.notif || 'Уведомления'}</span>
      </span>
      <div className="flex items-center gap-3 w-full max-w-3xl sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent p-3 lg:px-0 -my-3" style={{ zIndex: 90 }}>    
        <button 
          onClick={clearNotif}
          className="bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 h-12 active:scale-95 px-4 py-2 duration-300 cursor-pointer shadow flex-grow rounded-full text-zinc-100" 
        >
          {lang?.clear || 'Очистить'}
        </button>
        <Link 
          href="/settings/notifications"
          className="cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full"
        >
          <Icon name="IC-settings" className="inline w-8 h-8 fill-white" />
        </Link>
      </div>
      
      <div className="w-full flex flex-col gap-3 max-w-3xl px-3 lg:px-0">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/70 rounded-3xl p-1.5 flex items-center gap-3 w-full shadow duration-300 border border-zinc-600/30">
              <div className="w-12 h-12 rounded-3xl bg-zinc-800 shrink-0 animate-pulse"></div>
              <div className="flex flex-col gap-2 w-full">
                <div className="h-4 w-1/2 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="h-3 w-24 bg-zinc-800 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <div key={notif.id} className="bg-zinc-900/70 rounded-3xl p-1.5 flex items-center gap-3 w-full shadow duration-300 border border-zinc-600/30">
              {renderIcon(notif.type)}
              <div className="flex flex-col">
                <span className="text-base md:text-lg text-zinc-100 font-medium">
                  {translateContent(notif.content)}
                </span>
                <span className="text-xs md:text-sm text-zinc-300 font-thin">{notif.date}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center duration-300">
            <AppImage width={224} height={224} src="/img/load-placeholders/nothingfound.webp" className="h-56 w-auto" alt="Nothing found" />
            <span className="text-base text-zinc-100 w-full text-center font-black">
              {lang?.notification_empty || 'Ничего нет'}
            </span>
            <span className="text-sm text-zinc-300 w-full text-center font-medium">
              {lang?.notification_empty_desc || 'Здесь будут Ваши уведомления'}
            </span>
          </div>
        )}
      </div>
      
      <div className="lg:hidden"><br/><br/><br/><br/></div>
    </div>
  );
}
