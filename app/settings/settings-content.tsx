'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import AppImage from '../components/app-image';
import { useAuth } from '../context/AuthContext';
import { SettingsItem } from '../components/settings-item';
import AccountName from '../components/account-name';
import { normalizeAvatarUrl } from '../lib/avatar';
import Icon from '../components/svg-icon';
import { isInstalledApp } from '../lib/platform';

const subscribeNothing = () => () => {};

export default function SettingsPage() {
  const { user, isAuthenticated, lang } = useAuth();
  const userAvatarSrc = normalizeAvatarUrl(user?.img);
  // Баннер приложения — только в браузере: в PWA и нашем приложении он ни к чему. На сервере режим
  // запуска неизвестен, поэтому показываем после монтирования (без мигания в установленном приложении).
  const showAppBanner = useSyncExternalStore(subscribeNothing, () => !isInstalledApp(), () => false);

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <span className="w-full max-w-3xl text-3xl font-extralight">{lang?.settings || 'Настройки'}</span>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        {isAuthenticated && user && (
          <div className="flex items-center gap-3 w-full min-w-0">
            <AppImage
              src={userAvatarSrc}
              width={80}
              height={80}
              preload
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow border border-zinc-600/30 object-cover shrink-0"
              alt="avatar"
            />
            <div className="flex flex-col min-w-0">
              <AccountName user={user} nameClassName="text-xl lg:text-2xl font-bold text-white" badgeClassName="w-6 h-6 lg:w-7 lg:h-7" />
              <span className="lg:text-lg text-zinc-300">{user.desk}</span>
            </div>
          </div>
        )}
        {showAppBanner && (
          <Link
            href="/app/mobile"
            className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 flex items-center gap-3 hover:bg-zinc-800/60 active:scale-95 duration-300 cursor-pointer group"
          >
            <AppImage src="/img/zypo/logo-rounded.webp" alt="Zypo" width={48} height={48} className="w-12 h-12 rounded-full shadow shrink-0" />
            <div className="flex flex-col flex-grow min-w-0">
              <span className="text-lg font-semibold text-white">{lang?.settings_app_banner_title || 'Zypo в телефоне'}</span>
              <span className="text-sm text-zinc-400">{lang?.settings_app_banner_text || 'Приложение для Android и iPhone'}</span>
            </div>
            <Icon name="IC-chevron-right" className="w-6 h-6 fill-zinc-500 group-hover:fill-zinc-600 duration-300 shrink-0" />
          </Link>
        )}

        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          {isAuthenticated && (
            <>
              <SettingsItem
                href="/settings/account"
                title={lang?.account || 'Аккаунт'}
                iconBgClass="bg-pink-500/10"
                icon={
                  <Icon name="IC-user" className="w-6 h-6 fill-pink-500" />
                }
              />

              <SettingsItem
                href="/settings/security"
                title={lang?.security || 'Безопасность'}
                iconBgClass="bg-blue-500/10"
                icon={
                  <Icon name="IC-lock" className="w-6 h-6 fill-blue-500" />
                }
              />

              <SettingsItem
                href="/settings/socials"
                title={lang?.socialnetworks || 'Социальные сети'}
                iconBgClass="bg-lime-500/10"
                icon={
                  <Icon name="IC-socials" className="w-6 h-6 fill-lime-500" />
                }
              />

              <SettingsItem
                href="/settings/notifications"
                title={lang?.notif || 'Уведомления'}
                iconBgClass="bg-amber-500/10"
                icon={
                  <Icon name="IC-notification" className="w-6 h-6 fill-amber-500" />
                }
              />

              <SettingsItem
                href="/settings/cache"
                title={lang?.cache_settings || 'Память'}
                iconBgClass="bg-purple-500/10"
                icon={
                  <Icon name="IC-database" className="w-6 h-6 fill-purple-500" />
                }
              />
            </>
          )}

          <SettingsItem
            href="/settings/ui"
            title={lang?.interface_settings || 'Интерфейс'}
            iconBgClass="bg-cyan-500/10"
            icon={
              <Icon name="IC-full-mode" className="w-6 h-6 fill-cyan-400" />
            }
          />

          <SettingsItem
            href="/about"
            title={`${lang?.about || 'О'} Zypo`}
            iconBgClass="bg-emerald-500/10"
            icon={
              <Icon name="IC-book" className="w-6 h-6 fill-emerald-500" />
            }
          />

        </div>
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
