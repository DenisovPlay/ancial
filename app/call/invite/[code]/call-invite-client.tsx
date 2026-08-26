/* eslint-disable @next/next/no-img-element -- аватар диалога с внешнего хоста */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { AncialAPI, type VoiceInviteInfo } from '../../../lib/api-v2';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../../../messages/lib/messages-shared';

function readInviteCodeFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  const inviteIndex = parts.indexOf('invite');
  return inviteIndex >= 0 && parts[inviteIndex + 1] ? decodeURIComponent(parts[inviteIndex + 1]) : '';
}

export default function CallInviteClient() {
  const params = useParams<{ code?: string }>();
  const router = useRouter();
  const { isAuthenticated, lang, user } = useAuth();

  const code = (params?.code ? decodeURIComponent(params.code) : '') || readInviteCodeFromLocation();
  const [info, setInfo] = useState<VoiceInviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [enterAsGuest, setEnterAsGuest] = useState(false);

  useEffect(() => {
    if (!code) {
      const timer = setTimeout(() => {
        setFailed(true);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    AncialAPI.getVoiceInviteInfo(code)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const trimmedName = useMemo(() => name.trim().replace(/[\x00-\x1F\x7F]/g, ''), [name]);
  const canJoin = info !== null && trimmedName.length > 0 && trimmedName.length <= 48;

  const handleJoinAsUser = useCallback(() => {
    if (!info) return;
    const targetHash = info.hash || String(info.dialog_id);
    router.push(`/call/group/${encodeURIComponent(targetHash)}`);
  }, [info, router]);

  const handleGuestSubmit = useCallback((event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!canJoin || !info || !code) return;
    setJoining(true);
    const targetHash = info.hash || String(info.dialog_id);
    router.push(`/call/group/${encodeURIComponent(targetHash)}?guestCode=${encodeURIComponent(code)}&guestName=${encodeURIComponent(trimmedName)}`);
  }, [canJoin, code, info, router, trimmedName]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black p-3 text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin fill-purple-500" viewBox="0 0 48 48" aria-label={lang?.loading || 'Загрузка'}>
            <path d="M24 4a20 20 0 1 0 20 20h-6a14 14 0 1 1-14-14V4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (failed || !info) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black p-3 text-white">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 text-center shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
            <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-white">{lang?.voice_invite_invalid || 'Приглашение недействительно'}</span>
          <p className="text-sm text-zinc-400">
            {lang?.voice_invite_invalid_hint || 'Ссылка устарела или была отозвана. Попросите новую ссылку у организатора звонка.'}
          </p>
          <Link
            href="/messages"
            className="flex w-full cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800 p-3 text-sm font-medium text-white duration-300 hover:bg-zinc-700 active:scale-95"
          >
            {lang?.messages || 'Сообщения'}
          </Link>
        </div>
      </div>
    );
  }

  const userDisplayName = user ? [user.fname, user.lname].filter(Boolean).join(' ') || user.username : '';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black p-3 text-white">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 text-center shadow-2xl">
        <div className="relative">
          <img
            src={normalizeAssetUrl(info.avatar, FALLBACK_AVATAR)}
            alt=""
            className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow-md"
          />
          {info.in_call > 0 ? (
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-green-400/40 bg-green-600 text-white shadow"></span>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-xl font-semibold text-white">{info.title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>{info.members_count} {lang?.voice_invite_members || 'участников'}</span>
            {info.in_call > 0 ? (
              <>
                <span>•</span>
                <span className="font-medium text-green-400">{info.in_call} {lang?.voice_invite_in_call || 'в звонке'}</span>
              </>
            ) : null}
          </div>
        </div>

        {isAuthenticated && user && !enterAsGuest ? (
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={handleJoinAsUser}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-purple-600 p-3 font-medium text-white shadow-lg duration-300 hover:bg-purple-500 active:scale-95"
            >
              <span>{lang?.voice_invite_join_as || 'Войти как'} {userDisplayName}</span>
            </button>
            <button
              type="button"
              onClick={() => setEnterAsGuest(true)}
              className="cursor-pointer text-xs text-zinc-400 duration-300 hover:text-white"
            >
              {lang?.voice_invite_as_guest || 'Войти под другим именем'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleGuestSubmit} className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-3 text-left">
              <label htmlFor="guest-name-input" className="pl-3 text-xs text-zinc-400">
                {lang?.voice_invite_name_label || 'Как вас представить?'}
              </label>
              <input
                id="guest-name-input"
                type="text"
                value={name}
                maxLength={48}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder={lang?.voice_invite_name_placeholder || 'Ваше имя'}
                className="w-full rounded-full border border-zinc-600/30 bg-black/60 p-3 text-sm text-white outline-none duration-300 focus:border-purple-500 placeholder:text-zinc-600"
              />
            </div>

            <button
              type="submit"
              disabled={!canJoin || joining}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full bg-purple-600 px-3 py-2 font-medium text-white shadow-lg duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {joining ? (lang?.voice_invite_connecting || 'Подключение…') : (lang?.voice_invite_join || 'Присоединиться')}
            </button>

            {!isAuthenticated ? (
              <div className="text-xs text-zinc-500">
                <span>{lang?.voice_invite_have_account || 'Уже есть аккаунт?'} </span>
                <Link
                  href={`/login?return=${encodeURIComponent(`/call/invite/${code}`)}`}
                  className="text-purple-400 underline underline-offset-2 duration-300 hover:text-purple-300"
                >
                  {lang?.voice_invite_sign_in || 'Войти'}
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEnterAsGuest(false)}
                className="cursor-pointer text-xs text-zinc-400 duration-300 hover:text-white"
              >
                <span>{lang?.voice_invite_join_as || 'Войти как'} {userDisplayName}</span>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
