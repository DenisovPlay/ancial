"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { authFetch } from '../../lib/auth-fetch';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, lang, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    desk: '',
    country: '',
    city: '',
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  // Инициализация при загрузке пользователя (избегаем ошибок undefined)
  useEffect(() => {
    if (user) {
      setFormData({
        fname: user.fname || '',
        lname: user.lname || '',
        desk: user.desk || '',
        country: user.country || '',
        city: user.city || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateInform = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Добавляем все поля формы
      Object.entries(formData).forEach(([key, value]) => {
        params.append(key, value);
      });
      if (token) params.append('token', token);

      const res = await authFetch('/api/user/updateinfo.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (res.ok) {
        showNote({
          content: lang?.informupdated || 'Информация обновлена',
          type: 'success',
          time: 5
        });
        // Обновляем данные пользователя в приложении после сохранения
        if (checkAuth) {
            await checkAuth();
        }
      } else {
        throw new Error('Network error');
      }
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        type: 'error',
        time: 5
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-pink-400/25 md:from-transparent via-transparent to-transparent">
        <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent" style={{ zIndex: 99 }}>
          <div className="w-full max-w-3xl flex items-center gap-3">
            <span onClick={() => router.push('/settings')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer">
                <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <use href={`/icons.svg#IC-chevron-left`}></use>
                </svg> 
                {lang?.account || 'Аккаунт'} 
            </span>
          </div>
        </div>
        
        <div className="flex flex-col gap-0.5 w-full max-w-3xl px-3 lg:px-0">
            
            <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col w-full">
                    <span className="text-zinc-400 pl-4 z-20">{lang?.name || 'Имя'}</span>
                    <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                        <input id="fname" name="fname" type="text" autoComplete="off" value={formData.fname} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                    </div>
                </div>
                <div className="flex flex-col w-full">
                    <span className="text-zinc-400 pl-4 z-20">{lang?.lname || 'Фамилия'}</span>
                    <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                        <input id="lname" name="lname" type="text" autoComplete="off" value={formData.lname} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col w-full">
                <span className="text-zinc-400 pl-4 z-20">{lang?.description || 'О себе'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                    <input id="desk" name="desk" type="text" autoComplete="off" value={formData.desk} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                <div className="flex flex-col w-full">
                    <span className="text-zinc-400 pl-4 z-20">{lang?.country || 'Страна'}</span>
                    <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                        <input id="country" name="country" type="text" autoComplete="off" value={formData.country} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                    </div>
                </div>
                <div className="flex flex-col w-full">
                    <span className="text-zinc-400 pl-4 z-20">{lang?.city || 'Город'}</span>
                    <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                        <input id="city" name="city" type="text" autoComplete="off" value={formData.city} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                    </div>
                </div>
                <div className="flex flex-col w-full col-span-2 lg:col-span-1 -mt-3 lg:mt-0">
                    <span className="text-zinc-400 pl-4 z-20">{lang?.address || 'Адрес'}</span>
                    <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                        <input id="address" name="address" type="text" autoComplete="off" value={formData.address} onChange={handleChange} className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600" /> 
                    </div>
                </div>
            </div>

            <button 
              onClick={updateInform} 
              disabled={isLoading}
              className="border border-zinc-600/30 cursor-pointer mt-3 flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-50"
            >
              {isLoading ? '...' : (lang?.save || 'Сохранить')}
            </button>

        </div>
        
        <div className="lg:hidden"><br/><br/><br/><br/></div>
    </div>    
  );
}
