'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import GroupCallTile from '../../group/components/group-call-tile';
import { useGroupCall } from '../../group/[hash]/use-group-call';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, type VoiceInviteInfo } from '../../../lib/api-v2';

/**
 * Публичная страница приглашения в групповой звонок (/call/invite/<code>).
 * Работает БЕЗ авторизации: гость вводит имя → WS guest-auth → комната.
 */
function readInviteCodeFromLocation(): string {
  if (typeof window === 'undefined') return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  // /call/invite/<code>
  const inviteIndex = parts.indexOf('invite');
  return inviteIndex >= 0 && parts[inviteIndex + 1] ? decodeURIComponent(parts[inviteIndex + 1]) : '';
}

export default function GuestCallClient() {
  const { lang } = useAuth();
  const { showNote } = useNotification();

  const [info, setInfo] = useState<VoiceInviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  /** После подтверждения имени рендерим полноэкранную комнату в гостевом режиме. */
  const [roomOpen, setRoomOpen] = useState(false);

  // Единый эффект: читаем код из location (после маунта — hydration-safe,
  // SSR и первый клиентский кадр идентичны) и грузим инвайт. Все setState —
  // в асинхронных колбэках, синхронных каскадов нет.
  useEffect(() => {
    const code = readInviteCodeFromLocation();
    if (!code) {
      const t = setTimeout(() => {
        setFailed(true);
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
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
  }, []); // mount-once: код инвайта фиксируется на время жизни страницы

  // «Код отсутствует» и «запрос упал» — одна и та же ветка UI.
  const effectiveFailed = failed;

  const trimmedName = useMemo(() => name.trim().replace(/[\x00-\x1F\x7F]/g, ''), [name]);
  const canJoin = info !== null && trimmedName.length > 0 && trimmedName.length <= 48;

  const [roomCode, setRoomCode] = useState('');

  const handleJoin = useCallback(() => {
    if (!canJoin) return;
    setRoomCode(readInviteCodeFromLocation());
    setJoining(true);
    // Комната сама auth-ится по коду и имени.
    setRoomOpen(true);
  }, [canJoin]);

  const handleRoomClosed = useCallback(() => {
    setRoomOpen(false);
    showNote({
      content: lang?.voice_invite_closed || 'Звонок завершён или недоступен',
      type: 'info',
      time: 5,
    });
  }, [lang?.voice_invite_closed, showNote]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-12 w-12 animate-spin fill-purple-500" viewBox="0 0 48 48" aria-label="loading">
            <path d="M24 4a20 20 0 1 0 20 20h-6a14 14 0 1 1-14-14V4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (effectiveFailed || !info) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-3 text-white">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 text-center">
          <span className="text-lg font-semibold">{lang?.voice_invite_invalid || 'Приглашение недействительно'}</span>
          <p className="text-sm text-zinc-400">
            {lang?.voice_invite_invalid_hint || 'Ссылка устарела или была отозвана. Попросите новую ссылку у организатора звонка.'}
          </p>
        </div>
      </div>
    );
  }

  if (roomOpen) {
    // Гостевой режим комнаты: canPublish=true (говорить можно), id — отрицательный
    // временный маркер; реальный id придёт из WS auth_ok. useGroupCall(guest) сам всё делает.
    return (
      <GuestCallRoom
        code={roomCode}
        dialogId={info.dialog_id}
        guestName={trimmedName}
        title={info.title || 'Zypo'}
        onDisconnected={handleRoomClosed}
      />
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-3 text-white">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
        <div className="flex flex-col items-center gap-2 pt-3 text-center">
          {info.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- аватар чата с внешнего бэкенда
            <img src={info.avatar} alt="" className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow" />
          ) : null}
          <span className="pt-1 text-lg font-semibold">{info.title}</span>
          <span className="text-sm text-zinc-400">
            {(lang?.voice_invite_members || 'Участников чата') + ': ' + info.members_count}
            {' · '}
            {(lang?.voice_invite_in_call || 'сейчас в звонке') + ': ' + info.in_call}
          </span>
        </div>

        <div className="flex flex-col gap-3 px-1 pb-1">
          <span className="text-base font-semibold">{lang?.voice_invite_join_title || 'Войти в звонок'}</span>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-300">{lang?.voice_invite_name_label || 'Как вас представить?'}</span>
              <input
                type="text"
                value={name}
                maxLength={48}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleJoin();
                }}
                placeholder={lang?.voice_invite_name_placeholder || 'Ваше имя'}
                className="rounded-full border border-zinc-600/30 bg-black px-3 py-2 text-white outline-none duration-300 focus:border-purple-500"
              />
            </label>
            <button
              type="button"
              disabled={!canJoin || joining}
              onClick={handleJoin}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-purple-600 px-3 py-2 font-medium text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {joining ? (lang?.voice_invite_connecting || 'Подключение…') : (lang?.voice_invite_join || 'Присоединиться')}
            </button>
          <p className="text-center text-xs text-zinc-500">
            {lang?.voice_invite_no_account || 'Авторизация не требуется'}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Гостевая комната: лёгкая версия группового звонка.
 * Медиа-путь тот же (useGroupCall в guest-режиме), UI — без админ-функций.
 */
function GuestCallRoom({
  code,
  dialogId,
  guestName,
  title,
  onDisconnected,
}: {
  code: string;
  dialogId: number;
  guestName: string;
  title: string;
  onDisconnected: () => void;
}) {
  const { lang } = useAuth();

  const call = useGroupCall({
    activityUrl: '',
    canPublish: true,
    currentUserId: -1, // реальный отрицательный id придёт из auth_ok — на сигналинг не влияет (гость не offerer)
    dialogId,
    guestCode: code,
    guestName,
    onDisconnected,
    title,
  });

  // Автовход в комнату после монтирования: имя уже известно.
  useEffect(() => {
    if (!call.joined && !call.joining) {
      void call.join();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- одноразовый автологин в комнату
  }, []);

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-black text-white">
      <style>{`
        #NAVP, #NAVPmini, #NAVPfull, [data-app-nav=\"mobile\"], [data-app-nav=\"desktop\"] { display: none !important; }
        #main-content { padding: 0 !important; }
      `}</style>

      <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black via-black/90 to-transparent px-3 pb-8 pt-[max(env(safe-area-inset-top,0px),0.75rem)]">
        <div className="mx-auto max-w-7xl">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          <p className="text-sm text-zinc-400">{guestName}{call.joined ? '' : (' · ' + (lang?.voice_invite_connecting || 'Подключение…'))}</p>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-3 pt-[calc(max(env(safe-area-inset-top,0px),0.75rem)+4.5rem)] sm:grid-cols-2 lg:grid-cols-3">
        {call.participants.map((participant) => (
          <GroupCallTile
            key={participant.user_id}
            participant={participant}
            member={undefined}
            stream={call.remoteStreams[participant.user_id]}
            isLocal={false}
            deafened={call.deafened}
          />
        ))}
      </div>

      <footer className="z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] pt-6">
        <button
          type="button"
          onClick={call.toggleMic}
          aria-label={lang?.voice_mic || 'Микрофон'}
          className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border duration-300 active:scale-95 ${call.micEnabled ? 'border-zinc-600/30 bg-zinc-800 hover:bg-zinc-700' : 'border-red-400/40 bg-red-600/80'}`}
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 2c-4.95 0-9 4.05-9 9v15c0 4.95 4.05 9 9 9s9-4.05 9-9V11c0-4.95-4.05-9-9-9M10.5 21A1.5 1.5 0 0 0 9 22.5V26c0 7.76 5.93 14.17 13.5 14.92V45h-6a1.5 1.5 0 1 0 0 3h15a1.5 1.5 0 1 0 0-3h-6v-4.08C33.07 40.17 39 33.76 39 26v-3.5a1.5 1.5 0 1 0-3 0V26c0 6.59-5.26 11.89-11.82 11.99h-.37C17.25 37.89 12 32.58 12 26v-3.5a1.5 1.5 0 0 0-1.5-1.5" />
            {call.micEnabled ? null : <path d="m7.5 4.5 36 36-3 3-36-36z" />}
          </svg>
        </button>
        <button
          type="button"
          onClick={onDisconnected}
          aria-label={lang?.voice_room_leave || 'Выйти'}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-red-600 duration-300 hover:bg-red-500 active:scale-95"
        >
          <svg className="h-7 w-7 rotate-[135deg] fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.17.29.42.29.7 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C14.85 9.25 13.3 9 12 9z" />
          </svg>
        </button>
      </footer>
    </div>
  );
}
