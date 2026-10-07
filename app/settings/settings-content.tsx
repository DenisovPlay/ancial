'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { useDragScroll } from '../hooks/useDragScroll';
import { useScrollFades } from '../hooks/use-scroll-fades';

import AppImage from '../components/app-image';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { SettingsItem } from '../components/settings-item';
import AccountName from '../components/account-name';
import { normalizeAvatarUrl } from '../lib/avatar';
import Icon from '../components/svg-icon';
import { getAppPlatform, isInstalledApp } from '../lib/platform';

const subscribeNothing = () => () => {};

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** Карточка-напоминание: иконка, заголовок, пояснение; клик ведёт туда, где действие выполняется. */
function ReminderCard({ href, icon, iconBgClass, reserveText = false, text, title }: { href: string; icon: React.ReactNode; iconBgClass: string; reserveText?: boolean; text: string; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 flex h-full items-center gap-3 hover:bg-zinc-800/60 active:scale-95 duration-300 cursor-pointer group"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBgClass}`}>{icon}</span>
      <div className="flex flex-col flex-grow min-w-0">
        <span className="truncate text-base font-semibold text-white">{title}</span>
        {/* В карусели резервируем две строки: высота карточек одинакова при любом языке и тексте; одиночной карточке место не нужно */}
        <span className={cn('line-clamp-2 text-sm leading-5 text-zinc-400', reserveText && 'min-h-10')}>{text}</span>
      </div>
      <Icon name="IC-chevron-right" className="w-6 h-6 fill-zinc-500 group-hover:fill-zinc-600 duration-300 shrink-0" />
    </Link>
  );
}

export default function SettingsPage() {
  const { user, isAuthenticated, lang } = useAuth();
  const userAvatarSrc = normalizeAvatarUrl(user?.img);
  const remindersRef = useDragScroll({ speed: 2 });
  // Баннер приложения — только в браузере: в PWA и нашем приложении он ни к чему. На сервере режим
  // запуска неизвестен, поэтому показываем после монтирования (без мигания в установленном приложении).
  const showAppBanner = useSyncExternalStore(subscribeNothing, () => !isInstalledApp(), () => false);
  // Обязательные действия: пока не выполнены — карточка со ссылкой туда, где это делается.
  const needsEmail = isAuthenticated && Boolean(user) && !flag(user?.emailverif);
  // В iOS-сборке без сертификата пуши недоступны — не просим включить то, что включить нельзя.
  const needsPush = isAuthenticated && Boolean(user) && (!user?.pushsid || user.pushsid === '0') && getAppPlatform() !== 'ios';

  const reminderCount = Number(needsEmail) + Number(needsPush) + Number(showAppBanner);
  const reminders: Array<{ key: string; node: React.ReactNode }> = [];
  if (needsEmail) {
    reminders.push({
      key: 'email',
      node: (
        <ReminderCard
          reserveText={reminderCount > 1}
          href="/settings/security/contacts"
          icon={<Icon name="IC-email" className="w-6 h-6 fill-pink-400" />}
          iconBgClass="bg-pink-500/10"
          title={lang?.settings_reminder_email_title || 'Подтвердите почту'}
          text={lang?.settings_reminder_email_text || 'Для кодов входа и важных уведомлений.'}
        />
      ),
    });
  }
  if (needsPush) {
    reminders.push({
      key: 'push',
      node: (
        <ReminderCard
          reserveText={reminderCount > 1}
          href="/settings/notifications"
          icon={<Icon name="IC-notification" className="w-6 h-6 fill-amber-400" />}
          iconBgClass="bg-amber-500/10"
          title={lang?.settings_reminder_push_title || 'Включите уведомления'}
          text={lang?.settings_reminder_push_text || 'Чтобы оставаться на связи.'}
        />
      ),
    });
  }
  if (showAppBanner) {
    reminders.push({
      key: 'app',
      node: (
        <ReminderCard
          reserveText={reminderCount > 1}
          href="/app/mobile"
          icon={<AppImage src="/img/zypo/logo-rounded.webp" alt="Zypo" width={48} height={48} className="h-12 w-12 rounded-full shadow" />}
          iconBgClass=""
          title={lang?.settings_app_banner_title || 'Zypo в телефоне'}
          text={lang?.settings_app_banner_text || 'Приложение для Android и iPhone'}
        />
      ),
    });
  }

  const { leftRef: fadeLeftRef, rightRef: fadeRightRef } = useScrollFades(remindersRef, reminders.length);

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
        {reminders.length > 0 && (
          // Напоминания каруселью: на телефоне — свайп с прилипанием к карточке (snap только для касания: с мышью он дёргал перетаскивание), на ПК — плавное перетаскивание и затемнение краёв (как у табов ленты).
          <div className="relative -mx-3 lg:mx-0">
            <div ref={fadeLeftRef} className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-16 bg-gradient-to-r from-black to-transparent opacity-0 transition-opacity duration-300 lg:block" />
            <div ref={fadeRightRef} className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-16 bg-gradient-to-l from-black to-transparent opacity-0 transition-opacity duration-300 lg:block" />
            <div ref={remindersRef} className="drag-scroll viewport flex pointer-coarse:snap-x pointer-coarse:snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 lg:scroll-px-0 lg:px-0">
              {reminders.map((reminder) => (
                <div key={reminder.key} className={cn('shrink-0 pointer-coarse:snap-start', reminders.length > 1 ? 'w-[92%] sm:w-96' : 'w-full')}>
                  {reminder.node}
                </div>
              ))}
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
