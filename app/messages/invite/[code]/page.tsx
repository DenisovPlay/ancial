'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../../lib/messages-shared';

interface InviteData {
  id: number;
  hash: string;
  title: string;
  avatar: string;
  invite_code: string;
  members_count: number;
  sample_members: Array<{
    id: number;
    fname: string;
    lname: string;
    img: string;
    verify: number;
  }>;
  is_member: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || '';
  const { isAuthenticated, lang } = useAuth();
  const { showNote } = useNotification();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const getMembersCountText = (count: number) => {
    if (count === 1) return `${count} ${lang?.group_members_1 || 'участник'}`;
    if (count > 1 && count < 5) return `${count} ${lang?.group_members_2_4 || 'участника'}`;
    return `${count} ${lang?.group_members_5 || 'участников'}`;
  };

  const fetchInviteInfo = async () => {
    // Начальные состояния уже loading=true / error='' — синхронный setState
    // внутри эффекта не нужен и триггерит react-hooks/set-state-in-effect.
    try {
      const res = await AncialAPI.request<InviteData>(`/messages/GetInviteInfo.php?code=${encodeURIComponent(code)}`);

      if (res?.title || res?.id) {
        setInviteData(res);
      } else {
        setError(lang?.invite_not_found || 'Приглашение не найдено');
      }
    } catch (err) {
      setError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.invite_load_error || 'Ошибка загрузки информации о приглашении'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    // Легаси-паттерн: асинхронная загрузка данных при монтировании.
    // setState вызывается уже после await, не синхронно в теле эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchInviteInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- загрузка один раз на код приглашения
  }, [code]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/login?backurl=/messages/invite/${encodeURIComponent(code)}`);
      return;
    }

    if (inviteData?.is_member) {
      router.push(`/messages/${inviteData.hash}`);
      return;
    }

    setJoining(true);
    try {
      const res = await AncialAPI.request<{
        hash: string;
        message: string;
      }>('/messages/JoinByInvite.php', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      if (res?.hash) {
        showNote({ content: getApiMessage(res.message, lang, lang?.invite_joined_success || 'Вы успешно присоединились!'), type: 'success', time: 3 });
        router.push(`/messages/${res.hash}`);
      } else {
        showNote({ content: lang?.invite_join_failed || 'Не удалось присоединиться к чату', type: 'error', time: 4 });
      }
    } catch (err) {
      showNote({ content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.network_error || 'Ошибка сети'), type: 'error', time: 4 });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 text-white">
      <div className="w-full max-w-md p-3 bg-zinc-900 rounded-3xl border border-zinc-600/30 shadow-2xl flex flex-col items-center gap-5 text-center">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-zinc-400">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">{lang?.invite_loading || 'Загрузка приглашения...'}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white">{error}</span>
            <Link
              href="/messages"
              className="p-3 px-6 rounded-3xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/30 text-sm font-medium duration-300 active:scale-95 cursor-pointer text-white inline-block"
            >
              {lang?.invite_go_to_messages || lang?.go_to_messages || 'Перейти к сообщениям'}
            </Link>
          </div>
        ) : inviteData ? (
          <>
            <div className="flex flex-row w-full gap-3 items-center">
              <img
                src={normalizeAssetUrl(inviteData.avatar, FALLBACK_AVATAR)}
                alt=""
                className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover shadow-xl border border-zinc-600/30"
              />
              <div className="flex flex-col items-start w-full">
                <span className="text-2xl font-bold text-white w-full text-left">{inviteData.title}</span>
                <div className="flex flex-col items-start w-full">
                  <span className="text-xs lg:text-sm text-zinc-400 text-left flex-grow">
                    {getMembersCountText(inviteData.members_count)}
                  </span>
                  {inviteData.sample_members && inviteData.sample_members.length > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center -space-x-3">
                        {inviteData.sample_members.map((m) => (
                          <img
                            key={m.id}
                            src={normalizeAssetUrl(m.img, FALLBACK_AVATAR)}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border-2 border-zinc-900 shadow-md"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full p-3 rounded-3xl bg-purple-600 hover:bg-purple-500 border border-zinc-600/30 text-base font-bold duration-300 active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 mt-2"
            >
              {joining
                ? (lang?.invite_joining || 'Присоединение...')
                : inviteData.is_member
                  ? (lang?.invite_open_chat || 'Открыть чат')
                  : (lang?.invite_join_chat || 'Присоединиться к чату')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
