'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { SettingsItem } from '../../components/settings-item';

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
        <svg className="w-10 h-10 animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
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
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.security || 'Безопасность'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
          <SettingsItem
            href="/settings/security/password"
            title={lang?.password || 'Пароль'}
            iconBgClass="bg-amber-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-amber-500" viewBox="0 0 48 48">
                <use href="#IC-lock"></use>
              </svg>
            }
          />

          <SettingsItem
            href="/settings/security/contacts"
            title={lang?.phoneandnumber || 'Телефон и почта'}
            iconBgClass="bg-emerald-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-emerald-500" viewBox="0 0 48 48">
                <use href="#IC-user"></use>
              </svg>
            }
          />

          <SettingsItem
            href="/settings/security/privacy"
            title={lang?.confidentiality || 'Конфиденциальность'}
            iconBgClass="bg-purple-500/10"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-purple-500" viewBox="0 0 48 48">
                <use href="#IC-auth-eye"></use>
              </svg>
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
