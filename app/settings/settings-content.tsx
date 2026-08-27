'use client';

import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { SettingsItem } from '../components/settings-item';
import AccountName from '../components/account-name';
import { normalizeAvatarUrl } from '../lib/avatar';

export default function SettingsPage() {
  const { user, isAuthenticated, lang } = useAuth();
  const userAvatarSrc = normalizeAvatarUrl(user?.img);

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <span className="w-full max-w-3xl text-3xl font-extralight">{lang?.settings || 'Настройки'}</span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl">
        {isAuthenticated && user && (
          <div className="flex items-center gap-3 w-full px-3 lg:px-0">
            <Image
              src={userAvatarSrc}
              width={80}
              height={80}
              priority
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow border border-zinc-600/30 object-cover"
              alt="avatar"
            />
            <div className="flex flex-col">
              <AccountName user={user} nameClassName="text-xl lg:text-2xl font-bold text-white" badgeClassName="w-6 h-6 lg:w-7 lg:h-7" />
              <span className="lg:text-lg text-zinc-300">{user.desk}</span>
            </div>
          </div>
        )}
        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          {isAuthenticated && (
            <>
              <SettingsItem
                href="/settings/account"
                title={lang?.account || 'Аккаунт'}
                iconBgClass="bg-pink-500/10"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-pink-500" viewBox="0 0 48 48"><use href={`#IC-me`}></use></svg>
                }
              />

              <SettingsItem
                href="/settings/security"
                title={lang?.security || 'Безопасность'}
                iconBgClass="bg-blue-500/10"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-blue-500" viewBox="0 0 48 48"><use href={`#IC-lock`}></use></svg>
                }
              />

              <SettingsItem
                href="/settings/socials"
                title={lang?.socialnetworks || 'Социальные сети'}
                iconBgClass="bg-lime-500/10"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-lime-500" viewBox="0 0 48 48"><use href={`#IC-socials`}></use></svg>
                }
              />

              <SettingsItem
                href="/settings/notifications"
                title={lang?.notif || 'Уведомления'}
                iconBgClass="bg-amber-500/10"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-amber-500" viewBox="0 0 48 48"><use href={`#IC-notification`}></use></svg>
                }
              />

              <SettingsItem
                href="/settings/cache"
                title={lang?.cache_settings || 'Память'}
                iconBgClass="bg-purple-500/10"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-purple-500" viewBox="0 0 48 48"><use href={`#IC-database`}></use></svg>
                }
              />
            </>
          )}

          <SettingsItem
            href="/settings/ui"
            title={lang?.interface_settings || 'Интерфейс'}
            iconBgClass="bg-cyan-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-cyan-400" viewBox="0 0 48 48"><use href="#IC-full-mode"></use></svg>
            }
          />

          <SettingsItem
            href="/about"
            title={`${lang?.about || 'О'} Zypo`}
            iconBgClass="bg-emerald-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-emerald-500" viewBox="0 0 48 48"><use href={`#IC-book`}></use></svg>
            }
          />

        </div>
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
