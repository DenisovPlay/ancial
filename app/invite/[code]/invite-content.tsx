'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AccountName from '../../components/account-name';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../../messages/lib/messages-shared';

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

export default function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || '';
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    void fetchInviteInfo();
  }, [code]);

  const fetchInviteInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await AncialAPI.request<InviteData>(`/messages/GetInviteInfo.php?code=${encodeURIComponent(code)}`);

      if (res?.title || res?.id) {
        setInviteData(res);
      } else {
        setError('Приглашение не найдено');
      }
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки информации о приглашении');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/invite/${encodeURIComponent(code)}`);
      return;
    }

    setJoining(true);
    try {
      const res = await AncialAPI.request<{ success: boolean; hash?: string; dialog_id?: number; error?: string }>(
        '/messages/JoinByInvite.php',
        {
          method: 'POST',
          body: JSON.stringify({ code }),
        }
      );

      if (res?.success) {
        showNote({
          content: 'Вы успешно присоединились к беседе!',
          type: 'success',
          time: 3,
        });

        if (res.hash) {
          router.push(`/messages/${res.hash}`);
        } else {
          router.push('/messages');
        }
      } else {
        showNote({
          content: res?.error || 'Не удалось вступить в беседу',
          type: 'error',
          time: 4,
        });
      }
    } catch (err: any) {
      showNote({
        content: err?.message || 'Произошла ошибка при вступлении',
        type: 'error',
        time: 4,
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="text-sm text-zinc-400">Загрузка приглашения...</span>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-3">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-6 text-center backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Приглашение недействительно</h2>
          <p className="text-xs text-zinc-400">{error || 'Ссылка устарела или беседы больше не существует'}</p>
          <Link
            href="/"
            className="mt-2 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-3">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-zinc-600/30 bg-zinc-900/70 p-6 text-center shadow-2xl backdrop-blur-xl">
        <img
          src={normalizeAssetUrl(inviteData.avatar, FALLBACK_AVATAR)}
          alt={inviteData.title}
          className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow-lg"
        />

        <div className="flex flex-col items-center gap-1">
          <h1 className="text-xl font-bold text-zinc-100">{inviteData.title}</h1>
          <span className="text-xs font-medium text-zinc-400">
            {inviteData.members_count} {inviteData.members_count === 1 ? 'участник' : 'участников'}
          </span>
        </div>

        {inviteData.sample_members?.length > 0 && (
          <div className="flex items-center -space-x-2 my-1">
            {inviteData.sample_members.map((m) => (
              <img
                key={m.id}
                src={normalizeAssetUrl(m.img, FALLBACK_AVATAR)}
                alt=""
                className="h-7 w-7 rounded-full border-2 border-zinc-900 object-cover"
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex w-full flex-col gap-2">
          {inviteData.is_member ? (
            <button
              type="button"
              onClick={() => router.push(`/messages/${inviteData.hash}`)}
              className="w-full rounded-full bg-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 duration-300 hover:bg-purple-500 active:scale-95 cursor-pointer"
            >
              Перейти к беседе
            </button>
          ) : (
            <button
              type="button"
              disabled={joining}
              onClick={handleJoin}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 duration-300 hover:bg-purple-500 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {joining && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{isAuthenticated ? 'Вступить в беседу' : 'Войти и вступить'}</span>
            </button>
          )}

          <Link
            href="/"
            className="w-full rounded-full border border-zinc-600/30 bg-zinc-800/60 py-2.5 text-xs font-semibold text-zinc-300 duration-300 hover:bg-zinc-700/80 active:scale-95"
          >
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}
