'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';

function guessNoteType(responseText: string) {
  const normalized = responseText.toLowerCase();
  if (
    normalized.includes('ошиб') ||
    normalized.includes('error') ||
    normalized.includes('невер') ||
    normalized.includes('invalid')
  ) {
    return 'error' as const;
  }

  return 'success' as const;
}

export default function PasswordContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/password');
    }
  }, [isAuthenticated, isLoading, router]);

  const passwordButtonLabel = isSavingPassword ? '...' : lang?.save || 'Сохранить';

  const changePassword = async () => {
    if (!oldPassword) {
      showNote({
        content: lang?.enteroldpassword || 'Введите старый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (!newPassword) {
      showNote({
        content: lang?.enternewpassword || 'Введите новый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (!repeatPassword) {
      showNote({
        content: lang?.enterrepnewpassword || 'Повторите новый пароль',
        time: 5,
        type: 'info',
      });
      return;
    }

    if (newPassword.length <= 6) {
      showNote({
        content: lang?.newpasswordmustbe || 'Новый пароль должен быть длиннее 6 символов',
        time: 5,
        type: 'info',
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      const responseText = await AncialAPI.securityAction<string>('change_password', {
        oldpas: oldPassword,
        newpas: newPassword,
        nrepas: repeatPassword,
      });

      showNote({
        content: responseText || (lang?.done || 'Готово'),
        html: true,
        time: 5,
        type: guessNoteType(responseText || ''),
      });

      setOldPassword('');
      setNewPassword('');
      setRepeatPassword('');
      await checkAuth({ silent: true });
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

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
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-amber-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.password || 'Пароль'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 w-full max-w-3xl px-3 lg:px-0">
        <div className="grid lg:grid-cols-3 gap-3 w-full">
          <div className="flex flex-col w-full">
            <span className="text-zinc-400 pl-4 z-20">{lang?.old_pass || 'Старый пароль'}</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                autoComplete="off"
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
                id="oldpas"
                onChange={(event) => setOldPassword(event.target.value)}
                type="password"
                value={oldPassword}
              />
            </div>
          </div>
          <div className="flex flex-col w-full -mt-3 lg:mt-0">
            <span className="text-zinc-400 pl-4 z-20">{lang?.new_pass || 'Новый пароль'}</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                autoComplete="off"
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
                id="newpas"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </div>
          </div>
          <div className="flex flex-col w-full -mt-3 lg:mt-0">
            <span className="text-zinc-400 pl-4 z-20">
              {lang?.repeat_new_pass || 'Повторите новый пароль'}
            </span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                autoComplete="off"
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
                id="nrepas"
                onChange={(event) => setRepeatPassword(event.target.value)}
                type="password"
                value={repeatPassword}
              />
            </div>
          </div>
        </div>

        <button
          className="border border-zinc-600/30 cursor-pointer mt-3 flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-60"
          disabled={isSavingPassword}
          onClick={changePassword}
          type="button"
        >
          {passwordButtonLabel}
        </button>
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
