'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { SettingsItem } from '../../components/settings-item';
import Icon from '../../components/svg-icon';

export default function SecuritySettingsContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <Icon name="IC-loader" className="w-10 h-10 animate-spin fill-purple-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            {lang?.security || 'Безопасность'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl">
        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          <SettingsItem
            href="/settings/security/password"
            title={lang?.password || 'Пароль'}
            iconBgClass="bg-amber-500/10"
            icon={
              <Icon name="IC-lock" className="w-6 h-6 fill-amber-500" />
            }
          />

          <SettingsItem
            href="/settings/security/contacts"
            title={lang?.phoneandnumber || 'Телефон и почта'}
            iconBgClass="bg-emerald-500/10"
            icon={
              <Icon name="IC-user" className="w-6 h-6 fill-emerald-500" />
            }
          />

          <SettingsItem
            href="/settings/security/privacy"
            title={lang?.confidentiality || 'Конфиденциальность'}
            iconBgClass="bg-purple-500/10"
            icon={
              <Icon name="IC-auth-eye" className="w-6 h-6 fill-purple-500" />
            }
          />

          <SettingsItem
            href="/settings/security/2fa"
            title={lang?.twofa_title || 'Двухфакторная защита'}
            iconBgClass="bg-rose-500/10"
            icon={
              <Icon name="IC-lock" className="w-6 h-6 fill-rose-500" />
            }
          />

          <SettingsItem
            href="/settings/security/passkeys"
            title={lang?.passkeys_title || 'Passkeys'}
            iconBgClass="bg-teal-500/10"
            icon={
              <Icon name="IC-lock" className="w-6 h-6 fill-teal-500" />
            }
          />

          <SettingsItem
            href="/settings/security/sessions"
            title={lang?.active_sessions || 'Активные сессии'}
            iconBgClass="bg-sky-500/10"
            icon={
              <Icon name="IC-laptop" className="w-6 h-6 fill-sky-500" />
            }
          />
        </div>
      </div>

      <div className="lg:hidden">
        <br />
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}
