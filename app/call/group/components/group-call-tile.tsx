/* eslint-disable @next/next/no-img-element -- participant avatars may use user-configured remote hosts */
'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { FALLBACK_AVATAR, normalizeAssetUrl, type GroupMember } from '../../../messages/lib/messages-shared';
import type { GroupCallParticipant } from '../lib/group-call-state';

type Props = {
  deafened: boolean;
  focused?: boolean;
  isLocal: boolean;
  member?: GroupMember;
  onFocusChange?: (focused: boolean) => void;
  participant: GroupCallParticipant;
  stream?: MediaStream | null;
};

function MicrophoneStatusIcon({ off }: { off: boolean }) {
  return (
    <svg className="size-4 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 2c-4.95 0-9 4.05-9 9v15c0 4.95 4.05 9 9 9s9-4.05 9-9V11c0-4.95-4.05-9-9-9M10.48 20.98A1.5 1.5 0 0 0 9 22.5V26c0 7.76 5.93 14.17 13.5 14.92v4.58a1.5 1.5 0 1 0 3 0v-4.58C33.07 40.17 39 33.76 39 26v-3.5a1.5 1.5 0 1 0-3 0V26c0 6.59-5.26 11.89-11.82 11.99h-.37C17.26 37.89 12 32.58 12 26v-3.5a1.5 1.5 0 0 0-1.52-1.52" />
      {off ? <path d="m7.5 4.5 36 36-3 3-36-36z" /> : null}
    </svg>
  );
}

export default function GroupCallTile({
  deafened,
  focused = false,
  isLocal,
  member,
  onFocusChange,
  participant,
  stream,
}: Props) {
  const { lang } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = participant.cam_enabled || participant.screen_enabled;
  const focusLabel = focused
    ? (lang?.voice_return_to_grid || 'Вернуться к сетке')
    : (lang?.voice_focus_video || 'Развернуть видео');
  const displayName = [member?.fname, member?.lname].filter(Boolean).join(' ')
    || member?.username
    || `#${participant.user_id}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
    if (stream) void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <article className={`relative min-h-0 overflow-hidden rounded-3xl border bg-zinc-900 shadow-lg transition-[border-color,transform] duration-300 ${focused ? 'border-purple-400/50' : 'border-zinc-600/30'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || deafened}
        className={`absolute inset-0 h-full w-full ${participant.screen_enabled ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${hasVideo && stream ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 transition-opacity duration-300 ${hasVideo && stream ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <img
          src={normalizeAssetUrl(member?.img, FALLBACK_AVATAR)}
          alt=""
          className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow sm:h-24 sm:w-24"
        />
        <span className="max-w-[85%] truncate text-base font-semibold text-zinc-100 sm:text-lg">{displayName}</span>
      </div>

      {hasVideo && onFocusChange ? (
        <button
          type="button"
          aria-label={focusLabel}
          title={focusLabel}
          onClick={() => onFocusChange(!focused)}
          className="absolute inset-0 z-10 cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-purple-400"
        />
      ) : null}

      {hasVideo ? (
        <span className="pointer-events-none absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600/30 bg-black/55 text-white shadow backdrop-blur-md">
          <svg className="h-5 w-5 fill-current" viewBox="0 0 48 48" aria-hidden="true">
            {focused ? (
              <path d="M11.06 8.94a1.5 1.5 0 0 0-2.12 2.12L21.88 24 8.94 36.94a1.5 1.5 0 1 0 2.12 2.12L24 26.12l12.94 12.94a1.5 1.5 0 0 0 2.12-2.12L26.12 24l12.94-12.94a1.5 1.5 0 0 0-2.12-2.12L24 21.88z" />
            ) : (
              <path d="M7.5 5A2.5 2.5 0 0 0 5 7.5v10a1.5 1.5 0 1 0 3 0V8h9.5a1.5 1.5 0 1 0 0-3zm23 0a1.5 1.5 0 1 0 0 3H40v9.5a1.5 1.5 0 1 0 3 0v-10A2.5 2.5 0 0 0 40.5 5zM6.5 29a1.5 1.5 0 0 0-1.5 1.5v10A2.5 2.5 0 0 0 7.5 43h10a1.5 1.5 0 1 0 0-3H8v-9.5A1.5 1.5 0 0 0 6.5 29m35 0a1.5 1.5 0 0 0-1.5 1.5V40h-9.5a1.5 1.5 0 1 0 0 3h10a2.5 2.5 0 0 0 2.5-2.5v-10a1.5 1.5 0 0 0-1.5-1.5" />
            )}
          </svg>
        </span>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10">
        <span className="min-w-0 truncate text-sm font-medium text-white">
          {displayName}{isLocal ? ` (${lang?.you || 'Вы'})` : ''}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {participant.screen_enabled ? (
            <span className="rounded-full border border-purple-400/30 bg-purple-600/90 px-2 py-1 text-[10px] font-semibold text-white">
              {lang?.screen_share || 'Экран'}
            </span>
          ) : null}
          <span
            title={participant.mic_enabled ? (lang?.voice_mute || 'Микрофон') : (lang?.voice_unmute || 'Микрофон выключен')}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${participant.mic_enabled ? 'border-green-400/30 bg-green-600/90 text-white' : 'border-red-400/30 bg-red-600/90 text-white'}`}
          >
            <MicrophoneStatusIcon off={!participant.mic_enabled} />
          </span>
        </div>
      </div>
    </article>
  );
}
