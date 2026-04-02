'use client';

import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { SettingsItem } from '../components/settings-item';

export default function SettingsPage() {
  const { showNote } = useNotification();
  const { user, isAuthenticated, lang, updateLang } = useAuth();

  const selectLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value;
    try {
      const token = localStorage.getItem('token');
      
      const searchParams = new URLSearchParams();
      searchParams.append('lang', selectedLang);
      if (token) searchParams.append('token', token);

      const url = `/api/user/change_lang.php?${searchParams.toString()}`;

      const res = await fetch(url);
      
      const responseText = await res.text();
      
      showNote({
        content: responseText || (selectedLang === 'ru' ? 'Язык изменен' : 'Language changed'),
        html: true,
        type: 'success',
        time: 5
      });
      
      if (updateLang) {
        await updateLang();
      }
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.langname === 'en' ? 'Error =(' : 'Произошла ошибка =(',
        type: 'error',
        time: 5
      });
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <span className="w-full max-w-3xl text-3xl font-extralight">{lang?.settings || 'Настройки'}</span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        {isAuthenticated && user && (
          <div className="flex items-center gap-3 w-full mb-2">
            <img src={user.img || "/avatar.jpg"} className="w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow border border-zinc-600/30 object-cover" alt="avatar" />
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-bold text-white">{user.fname} {user.lname}</span>
              <span className="lg:text-lg text-zinc-300">{user.desk}</span>
            </div>
          </div>
        )}

        {isAuthenticated && (
          <>
            <SettingsItem 
              href="/settings/account"
              title={lang?.account || 'Аккаунт'}
              iconBgClass="bg-pink-500/10"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-pink-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-me`}></use></svg>
              }
            />

            <SettingsItem 
              href="/settings/security"
              title={lang?.security || 'Безопасность'}
              iconBgClass="bg-blue-500/10"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-blue-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-lock`}></use></svg>
              }
            />

            <SettingsItem 
              href="/settings/socials"
              title={lang?.socialnetworks || 'Социальные сети'}
              iconBgClass="bg-lime-500/10"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-lime-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-socials`}></use></svg>
              }
            />

            <SettingsItem 
              href="/settings/notifications"
              title={lang?.notif || 'Уведомления'}
              iconBgClass="bg-amber-500/10"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-amber-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-notification`}></use></svg>
              }
            />
          </>
        )}

        <SettingsItem 
          title={lang?.language || 'Язык'}
          iconBgClass="bg-red-500/10"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-red-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-globe`}></use></svg>
          }
          rightContent={
            <select
              onChange={selectLanguage}
              value={lang?.langname === 'en' ? 'en' : 'ru'}
              className="bg-zinc-700/70 hover:bg-zinc-700/60 duration-300 p-1 rounded-2xl mr-2 shadow cursor-pointer text-white border-0 focus:ring-0"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          }
        />

        <SettingsItem 
          href="/about"
          title={`${lang?.about || 'О'} Ancial`}
          iconBgClass="bg-emerald-500/10"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-emerald-500" viewBox="0 0 48 48"><use href={`/icons.svg#IC-book`}></use></svg>
          }
        />
      </div>
      
      <div className="lg:hidden"><br/><br/><br/><br/></div>
    </div>
  );
}
