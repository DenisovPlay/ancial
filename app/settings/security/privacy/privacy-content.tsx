'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

type PresenceVisibility = 'everyone' | 'friends' | 'nobody';

interface PresencePrivacy {
  online_visibility: PresenceVisibility;
  page_visibility: PresenceVisibility;
  music_visibility: PresenceVisibility;
  chat_visibility: PresenceVisibility;
  call_visibility: PresenceVisibility;
  allow_call_join: PresenceVisibility;
}

const DEFAULT_PRESENCE_PRIVACY: PresencePrivacy = {
  online_visibility: 'friends',
  page_visibility: 'nobody',
  music_visibility: 'friends',
  chat_visibility: 'nobody',
  call_visibility: 'friends',
  allow_call_join: 'friends',
};

function LegacySwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        checked={checked}
        className="sr-only peer"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <div className="group peer bg-zinc-800 rounded-full duration-300 w-10 h-6 after:duration-300 after:bg-red-500 peer-checked:after:bg-green-500 after:rounded-full after:absolute after:h-6 after:w-6 after:top-0 after:left-0 after:flex after:justify-center after:items-center peer-checked:after:translate-x-4 peer-hover:after:scale-105"></div>
    </label>
  );
}

export default function PrivacySecurityContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [searchShow, setSearchShow] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [groupAddPrivacy, setGroupAddPrivacy] = useState<number>(0);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [presencePrivacy, setPresencePrivacy] = useState<PresencePrivacy>(DEFAULT_PRESENCE_PRIVACY);

  useEffect(() => {
    if (user) {
      setSearchShow(flag(user.searchshow));
      setMessagesOpen(flag(user.msgopen));
      setGroupAddPrivacy(user.group_add_privacy !== undefined ? Number(user.group_add_privacy) : 0);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void AncialAPI.getPresencePrivacy<PresencePrivacy>()
      .then((privacy) => {
        if (active) setPresencePrivacy(privacy);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/privacy');
    }
  }, [isAuthenticated, isLoading, router]);

  const privacyButtonLabel = isSavingPrivacy ? '...' : lang?.save || 'Сохранить';

  const updateInform = async () => {
    setIsSavingPrivacy(true);

    try {
      await Promise.all([
        AncialAPI.updateProfile({
          searchshow: searchShow ? '1' : '2',
          msgopen: messagesOpen ? '1' : '2',
          group_add_privacy: String(groupAddPrivacy),
        }),
        AncialAPI.updatePresencePrivacy(presencePrivacy),
      ]);

      showNote({
        content: lang?.informupdated || 'Информация обновлена',
        time: 5,
        type: 'success',
      });

      await checkAuth({ silent: true });
    } catch (error) {
      console.error(error);
      showNote({
        content: lang?.errorhappend || 'Произошла ошибка =(',
        time: 5,
        type: 'error',
      });
    } finally {
      setIsSavingPrivacy(false);
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
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-purple-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <span
            onClick={() => router.push('/settings/security')}
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.confidentiality || 'Конфиденциальность'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <div className="cursor-pointer flex gap-3">
          <span className="w-full text-zinc-300">{lang?.showinsearch || 'Показывать в поиске'}</span>
          <div className="flex items-center h-5">
            <LegacySwitch checked={searchShow} onChange={setSearchShow} />
          </div>
        </div>

        <div className="cursor-pointer flex gap-3">
          <span className="w-full text-zinc-300">{lang?.openmessages || 'Открытые сообщения'}</span>
          <div className="flex items-center h-5">
            <LegacySwitch checked={messagesOpen} onChange={setMessagesOpen} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-3">
          <span className="w-full text-zinc-300">
            {lang?.group_add_privacy_title || 'Кто может добавлять меня в групповые чаты'}
          </span>
          <div className="flex flex-row gap-3 w-full lg:w-fit">
            {[
              { value: 0, label: lang?.privacy_everyone || 'Все' },
              { value: 1, label: lang?.privacy_friends || 'Друзья' },
              { value: 2, label: lang?.privacy_nobody || 'Никто' },
            ].map((opt) => (
              <div
                key={opt.value}
                onClick={() => setGroupAddPrivacy(opt.value)}
                className={`w-full px-3 py-1.5 rounded-3xl border border-zinc-600/30 cursor-pointer duration-300 active:scale-95 flex items-center justify-center ${groupAddPrivacy === opt.value
                  ? 'border-purple-500 bg-purple-500/25'
                  : 'bg-zinc-800/30 hover:bg-zinc-800/60'
                  }`}
              >
                <span className="text-white font-medium text-sm">{opt.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xl">{lang?.presence_privacy_title || 'Видимость активности'}</span>
          {([
            ['online_visibility', lang?.presence_online_visibility || 'Статус в сети'],
            ['page_visibility', lang?.presence_page_visibility || 'Просматриваемая страница'],
            ['music_visibility', lang?.presence_music_visibility || 'Прослушиваемая музыка'],
            ['chat_visibility', lang?.presence_chat_visibility || 'Активность в чатах'],
            ['call_visibility', lang?.presence_call_visibility || 'Участие в звонках'],
            ['allow_call_join', lang?.presence_call_join_visibility || 'Кто может подключаться к звонкам'],
          ] as Array<[keyof PresencePrivacy, string]>).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1.5 text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{label}</span>
              <select
                value={presencePrivacy[key]}
                onChange={(event) =>
                  setPresencePrivacy((current) => ({
                    ...current,
                    [key]: event.target.value as PresenceVisibility,
                  }))
                }
                className="h-10 cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 text-white outline-none"
              >
                <option value="everyone">{lang?.privacy_everyone || 'Все пользователи'}</option>
                <option value="friends">{lang?.privacy_friends || 'Только друзья'}</option>
                <option value="nobody">{lang?.privacy_nobody || 'Никто'}</option>
              </select>
            </label>
          ))}
        </div>

        <button
          className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-60"
          disabled={isSavingPrivacy}
          onClick={updateInform}
          type="button"
        >
          {privacyButtonLabel}
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
