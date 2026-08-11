/* eslint-disable @next/next/no-img-element -- participant avatars may use user-configured remote hosts */
'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { FALLBACK_AVATAR, normalizeAssetUrl, type GroupMember } from '../../../messages/lib/messages-shared';
import type { GroupCallParticipant } from '../lib/group-call-state';

type Props = {
  deafened: boolean;
  isLocal: boolean;
  member?: GroupMember;
  participant: GroupCallParticipant;
  stream?: MediaStream | null;
};

export default function GroupCallTile({ deafened, isLocal, member, participant, stream }: Props) {
  const { lang } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasVideo = participant.cam_enabled || participant.screen_enabled;
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
    <article className="relative min-h-0 overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-900 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || deafened}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${hasVideo && stream ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 transition-opacity duration-300 ${hasVideo && stream ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <img
          src={normalizeAssetUrl(member?.img, FALLBACK_AVATAR)}
          alt=""
          className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow sm:h-24 sm:w-24"
        />
        <span className="max-w-[85%] truncate text-base font-semibold text-zinc-100 sm:text-lg">{displayName}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-10">
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
            {participant.mic_enabled ? '●' : '×'}
          </span>
        </div>
      </div>
    </article>
  );
}
