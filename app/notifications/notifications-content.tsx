"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: string;
  content: string;
  date: string;
  type: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/notifications');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchNotifications = async () => {
    try {
      // Сначала пытаемся достать из кеша
      const cached = localStorage.getItem('notifications_cache');
      if (cached) {
        setNotifications(JSON.parse(cached));
        setIsLoading(false); // Отключаем лоадер сразу, так как есть кеш
      } else {
        setIsLoading(true);
      }

      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (token) params.append('token', token);

      const url = `/api/user/getNotifications?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'success') {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        localStorage.setItem('notifications_cache', JSON.stringify(notifs));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const clearNotif = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (token) params.append('token', token);

      await fetch('/api/user/clearnotify.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      setNotifications([]);
      localStorage.setItem('notifications_cache', JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const translateContent = (text: string) => {
    if (lang?.langname === 'en') {
      return text
        .replace('написал вам!', 'wrote to you!')
        .replace('хочет добавить вас в друзья', 'wants you to become friends')
        .replace('поставил вам лайк!', 'liked your post!')
        .replace('создал с вами диалог!', 'created a dialogue with you!')
        .replace('отправил фотографию', 'sent a photo')
        .replace('звонит вам', 'calls you');
    }
    return text;
  };

  const renderIcon = (type: string) => {
    if (type === '1') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-purple-500/25 fill-purple-500 shrink-0">
          <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 3.9980469 C 12.972292 3.9980469 4 12.970339 4 23.998047 C 4 27.273363 4.8627078 30.334853 6.2617188 33.064453 L 4.09375 40.826172 C 3.5887973 42.629575 5.3719261 44.41261 7.1757812 43.908203 L 14.943359 41.740234 C 17.670736 43.136312 20.727751 43.998047 24 43.998047 C 35.027708 43.998047 44 35.025755 44 23.998047 C 44 12.970339 35.027708 3.9980469 24 3.9980469 z M 24 6.9980469 C 33.406292 6.9980469 41 14.591755 41 23.998047 C 41 33.404339 33.406292 40.998047 24 40.998047 C 20.998416 40.998047 18.190601 40.217527 15.742188 38.853516 A 1.50015 1.50015 0 0 0 14.609375 38.71875 L 7.2226562 40.779297 L 9.2851562 33.396484 A 1.50015 1.50015 0 0 0 9.1503906 32.261719 C 7.7836522 29.811523 7 27.002565 7 23.998047 C 7 14.591755 14.593708 6.9980469 24 6.9980469 z M 15.5 18.998047 A 1.50015 1.50015 0 1 0 15.5 21.998047 L 32.5 21.998047 A 1.50015 1.50015 0 1 0 32.5 18.998047 L 15.5 18.998047 z M 15.5 25.998047 A 1.50015 1.50015 0 1 0 15.5 28.998047 L 28.5 28.998047 A 1.50015 1.50015 0 1 0 28.5 25.998047 L 15.5 25.998047 z"></path></svg>
        </div>
      );
    } else if (type === '2') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-pink-500/25 fill-pink-500 shrink-0">
          <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 15 7 C 8.9424416 7 4 11.942442 4 18 C 4 22.096154 7.0876448 25.952899 10.851562 29.908203 C 14.615481 33.863507 19.248379 37.869472 22.939453 41.560547 A 1.50015 1.50015 0 0 0 25.060547 41.560547 C 28.751621 37.869472 33.384518 33.863507 37.148438 29.908203 C 40.912356 25.952899 44 22.096154 44 18 C 44 11.942442 39.057558 7 33 7 C 29.523564 7 26.496821 8.8664883 24 12.037109 C 21.503179 8.8664883 18.476436 7 15 7 z M 15 10 C 17.928571 10 20.3663 11.558399 22.732422 15.300781 A 1.50015 1.50015 0 0 0 25.267578 15.300781 C 27.6337 11.558399 30.071429 10 33 10 C 37.436442 10 41 13.563558 41 18 C 41 20.403846 38.587644 24.047101 34.976562 27.841797 C 31.68359 31.30221 27.590312 34.917453 24 38.417969 C 20.409688 34.917453 16.31641 31.30221 13.023438 27.841797 C 9.4123552 24.047101 7 20.403846 7 18 C 7 13.563558 10.563558 10 15 10 z"></path></svg>
        </div>
      );
    } else if (type === '3') {
      return (
        <div className="border border-zinc-600/30 shadow flex justify-center items-center w-12 h-12 rounded-3xl bg-lime-500/25 fill-lime-500 shrink-0">
          <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 17 2 C 11.494917 2 7 6.494921 7 12 C 7 17.505079 11.494917 22 17 22 C 22.505083 22 27 17.505079 27 12 C 27 6.494921 22.505083 2 17 2 z M 17 5 C 20.883764 5 24 8.1162385 24 12 C 24 15.883762 20.883764 19 17 19 C 13.116236 19 10 15.883762 10 12 C 10 8.1162385 13.116236 5 17 5 z M 35 24 C 28.925 24 24 28.925 24 35 C 24 41.075 28.925 46 35 46 C 41.075 46 46 41.075 46 35 C 46 28.925 41.075 24 35 24 z M 6.2226562 26 C 4.1706562 26 2.5 27.784516 2.5 29.978516 L 2.5 31.5 C 2.5 34.781 4.1953906 37.632344 7.2753906 39.527344 C 9.8663906 41.122344 13.32 42 17 42 C 19.19 42 21.431516 41.675766 23.478516 41.009766 C 23.018516 40.128766 22.664062 39.186172 22.414062 38.201172 C 20.717062 38.735172 18.837 39 17 39 C 11.461 39 5.5 36.653 5.5 31.5 L 5.5 29.978516 C 5.5 29.447516 5.8316562 29 6.2226562 29 L 23.474609 29 C 24.049609 27.897 24.778813 26.889 25.632812 26 L 6.2226562 26 z M 35 27 C 35.552 27 36 27.448 36 28 L 36 34 L 42 34 C 42.552 34 43 34.448 43 35 C 43 35.552 42.552 36 42 36 L 36 36 L 36 42 C 36 42.552 35.552 43 35 43 C 34.448 43 34 42.552 34 42 L 34 36 L 28 36 C 27.448 36 27 35.552 27 35 C 27 34.448 27.448 34 28 34 L 34 34 L 34 28 C 34 27.448 34.448 27 35 27 z"></path></svg>
        </div>
      );
    }
    return null;
  };

  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="flex flex-col justify-center items-center py-10 w-full">
        <span className="text-zinc-400">Загрузка...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
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
        <button 
          onClick={() => router.push('/settings/notifications')} 
          className="cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full"
        >
          <svg className="inline w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 4 C 22.423103 4 20.902664 4.1994284 19.451172 4.5371094 A 1.50015 1.50015 0 0 0 18.300781 5.8359375 L 17.982422 8.7382812 C 17.878304 9.6893592 17.328913 10.530853 16.5 11.009766 C 15.672739 11.487724 14.66862 11.540667 13.792969 11.15625 L 13.791016 11.15625 L 11.125 9.9824219 A 1.50015 1.50015 0 0 0 9.4257812 10.330078 C 7.3532865 12.539588 5.7626807 15.215064 4.859375 18.201172 A 1.50015 1.50015 0 0 0 5.4082031 19.845703 L 7.7734375 21.580078 C 8.5457929 22.147918 9 23.042801 9 24 C 9 24.95771 8.5458041 25.853342 7.7734375 26.419922 L 5.4082031 28.152344 A 1.50015 1.50015 0 0 0 4.859375 29.796875 C 5.7625845 32.782665 7.3519262 35.460112 9.4257812 37.669922 A 1.50015 1.50015 0 0 0 11.125 38.015625 L 13.791016 36.841797 C 14.667094 36.456509 15.672169 36.511947 16.5 36.990234 C 17.328913 37.469147 17.878304 38.310641 17.982422 39.261719 L 18.300781 42.164062 A 1.50015 1.50015 0 0 0 19.449219 43.460938 C 20.901371 43.799844 22.423103 44 24 44 C 25.576897 44 27.097336 43.800572 28.548828 43.462891 A 1.50015 1.50015 0 0 0 29.699219 42.164062 L 30.017578 39.261719 C 30.121696 38.310641 30.671087 37.469147 31.5 36.990234 C 32.327261 36.512276 33.33138 36.45738 34.207031 36.841797 L 36.875 38.015625 A 1.50015 1.50015 0 0 0 38.574219 37.669922 C 40.646713 35.460412 42.237319 32.782983 43.140625 29.796875 A 1.50015 1.50015 0 0 0 42.591797 28.152344 L 40.226562 26.419922 C 39.454197 25.853342 39 24.95771 39 24 C 39 23.04229 39.454197 22.146658 40.226562 21.580078 L 42.591797 19.847656 A 1.50015 1.50015 0 0 0 43.140625 18.203125 C 42.237319 15.217017 40.646713 12.539588 38.574219 10.330078 A 1.50015 1.50015 0 0 0 36.875 9.984375 L 34.207031 11.158203 C 33.33138 11.54262 32.327261 11.487724 31.5 11.009766 C 30.671087 10.530853 30.121696 9.6893592 30.017578 8.7382812 L 29.699219 5.8359375 A 1.50015 1.50015 0 0 0 28.550781 4.5390625 C 27.098629 4.2001555 25.576897 4 24 4 z M 24 7 C 24.974302 7 25.90992 7.1748796 26.847656 7.3398438 L 27.035156 9.0644531 C 27.243038 10.963375 28.346913 12.652335 30 13.607422 C 31.654169 14.563134 33.668094 14.673009 35.416016 13.904297 L 37.001953 13.207031 C 38.219788 14.669402 39.183985 16.321182 39.857422 18.130859 L 38.451172 19.162109 C 36.911538 20.291529 36 22.08971 36 24 C 36 25.91029 36.911538 27.708471 38.451172 28.837891 L 39.857422 29.869141 C 39.183985 31.678818 38.219788 33.330598 37.001953 34.792969 L 35.416016 34.095703 C 33.668094 33.326991 31.654169 33.436866 30 34.392578 C 28.346913 35.347665 27.243038 37.036625 27.035156 38.935547 L 26.847656 40.660156 C 25.910002 40.82466 24.973817 41 24 41 C 23.025698 41 22.09008 40.82512 21.152344 40.660156 L 20.964844 38.935547 C 20.756962 37.036625 19.653087 35.347665 18 34.392578 C 16.345831 33.436866 14.331906 33.326991 12.583984 34.095703 L 10.998047 34.792969 C 9.7799772 33.330806 8.8159425 31.678964 8.1425781 29.869141 L 9.5488281 28.837891 C 11.088462 27.708471 12 25.91029 12 24 C 12 22.08971 11.087719 20.290363 9.5488281 19.160156 L 8.1425781 18.128906 C 8.8163325 16.318532 9.7814501 14.667839 11 13.205078 L 12.583984 13.902344 C 14.331906 14.671056 16.345831 14.563134 18 13.607422 C 19.653087 12.652335 20.756962 10.963375 20.964844 9.0644531 L 21.152344 7.3398438 C 22.089998 7.1753403 23.026183 7 24 7 z M 24 16 C 19.599487 16 16 19.59949 16 24 C 16 28.40051 19.599487 32 24 32 C 28.400513 32 32 28.40051 32 24 C 32 19.59949 28.400513 16 24 16 z M 24 19 C 26.779194 19 29 21.220808 29 24 C 29 26.779192 26.779194 29 24 29 C 21.220806 29 19 26.779192 19 24 C 19 21.220808 21.220806 19 24 19 z"></path></svg>
        </button>
      </div>
      
      <div className="w-full flex flex-col gap-3 max-w-3xl px-3 lg:px-0">
        {notifications.length > 0 ? (
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
            <img src="/includes/img/anlite/nothingfound.webp" className="h-56" alt="Nothing found" />
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