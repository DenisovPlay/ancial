'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { FALLBACK_AVATAR, normalizeAssetUrl, type GroupMember } from '../../../messages/lib/messages-shared';
import { hasPlayableVideoTrack, type GroupCallParticipant } from '../lib/group-call-state';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';

type Props = {
  deafened: boolean;
  focused?: boolean;
  isLocal: boolean;
  member?: GroupMember;
  onFocusChange?: (focused: boolean) => void;
  onDisconnect?: () => void;
  participant: GroupCallParticipant;
  stream?: MediaStream | null;
};

export default function GroupCallTile({
  deafened,
  focused = false,
  isLocal,
  member,
  onFocusChange,
  onDisconnect,
  participant,
  stream,
}: Props) {
  const { lang } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const advertisedVideo = isLocal
    ? Boolean((participant.cam_enabled || participant.screen_enabled) || (stream && hasPlayableVideoTrack(stream.getTracks())))
    : Boolean(participant.cam_enabled || participant.screen_enabled);
  const [hasPlayableVideo, setHasPlayableVideo] = useState(() => (
    stream ? hasPlayableVideoTrack(stream.getTracks()) : false
  ));
  const focusLabel = focused
    ? (lang?.voice_return_to_grid || 'Вернуться к сетке')
    : (lang?.voice_focus_video || 'Развернуть видео');
  // Гости звонка приходят без member-профиля — имя несёт сам participant (поле name от WS).
  const displayName = [member?.fname, member?.lname].filter(Boolean).join(' ')
    || participant.name
    || member?.username
    || `#${participant.user_id}`;

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    let videoOnlyStream: MediaStream | null = null;
    let audioOnlyStream: MediaStream | null = null;
    const attemptPlayback = () => {
      if (!videoOnlyStream || video.srcObject !== videoOnlyStream) return;
      void video.play().catch(() => undefined);
    };
    const attemptAudioPlayback = () => {
      if (!audioOnlyStream || audio.srcObject !== audioOnlyStream || isLocal || deafened) return;
      void audio.play().catch(() => undefined);
    };
    const attachStream = () => {
      const videoTracks = stream ? stream.getVideoTracks() : [];
      const audioTracks = stream ? stream.getAudioTracks() : [];
      videoOnlyStream = videoTracks.length > 0 ? new MediaStream(videoTracks) : null;
      audioOnlyStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
      video.srcObject = videoOnlyStream;
      audio.srcObject = audioOnlyStream;
      attemptPlayback();
      attemptAudioPlayback();
    };
    const updateVideoReadiness = () => {
      setHasPlayableVideo(Boolean(stream && hasPlayableVideoTrack(stream.getTracks())));
    };
    const observedTracks = new Set<MediaStreamTrack>();
    const observeTrack = (track: MediaStreamTrack) => {
      if (track.kind !== 'video' || observedTracks.has(track)) return;
      observedTracks.add(track);
      track.addEventListener('mute', updateVideoReadiness);
      track.addEventListener('unmute', attemptPlayback);
      track.addEventListener('unmute', updateVideoReadiness);
      track.addEventListener('ended', updateVideoReadiness);
    };
    const unobserveTrack = (track: MediaStreamTrack) => {
      observedTracks.delete(track);
      track.removeEventListener('mute', updateVideoReadiness);
      track.removeEventListener('unmute', attemptPlayback);
      track.removeEventListener('unmute', updateVideoReadiness);
      track.removeEventListener('ended', updateVideoReadiness);
    };
    const handleTrackAdded = (event: MediaStreamTrackEvent) => {
      observeTrack(event.track);
      updateVideoReadiness();
      attachStream();
    };
    const handleTrackRemoved = (event: MediaStreamTrackEvent) => {
      unobserveTrack(event.track);
      updateVideoReadiness();
      attachStream();
    };
    stream?.getVideoTracks().forEach(observeTrack);
    stream?.addEventListener('addtrack', handleTrackAdded);
    stream?.addEventListener('removetrack', handleTrackRemoved);
    video.addEventListener('loadedmetadata', attemptPlayback);
    video.addEventListener('canplay', attemptPlayback);
    audio.addEventListener('loadedmetadata', attemptAudioPlayback);
    audio.addEventListener('canplay', attemptAudioPlayback);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') attachStream();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    updateVideoReadiness();
    attachStream();
    return () => {
      stream?.removeEventListener('addtrack', handleTrackAdded);
      stream?.removeEventListener('removetrack', handleTrackRemoved);
      video.removeEventListener('loadedmetadata', attemptPlayback);
      video.removeEventListener('canplay', attemptPlayback);
      audio.removeEventListener('loadedmetadata', attemptAudioPlayback);
      audio.removeEventListener('canplay', attemptAudioPlayback);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observedTracks.forEach(unobserveTrack);
      if (video.srcObject === videoOnlyStream) video.srcObject = null;
      if (audio.srcObject === audioOnlyStream) audio.srcObject = null;
    };
  }, [deafened, isLocal, stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    void video.play().catch(() => undefined);
  }, [focused]);

  return (
    <article className={`relative min-h-0 overflow-hidden rounded-3xl border bg-zinc-900 shadow-lg transition-[border-color,transform] duration-300 ${focused ? 'border-purple-400/50' : 'border-zinc-600/30'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 h-full w-full ${participant.screen_enabled ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${advertisedVideo && hasPlayableVideo ? 'opacity-100' : 'opacity-0'}`}
      />
      <audio ref={audioRef} autoPlay muted={isLocal || deafened} />

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 transition-opacity duration-300 ${advertisedVideo && hasPlayableVideo ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <AppImage
          width={96}
          height={96}
          fallbackSrc={FALLBACK_AVATAR}
          src={normalizeAssetUrl(member?.img || participant.img, FALLBACK_AVATAR)}
          alt=""
          className="h-20 w-20 rounded-full border border-zinc-600/30 object-cover shadow sm:h-24 sm:w-24"
        />
        <span className="max-w-[85%] truncate text-base font-semibold text-zinc-100 sm:text-lg">{displayName}</span>
      </div>

      {advertisedVideo && hasPlayableVideo && onFocusChange ? (
        <button
          type="button"
          aria-label={focusLabel}
          title={focusLabel}
          onClick={() => onFocusChange(!focused)}
          className="absolute inset-0 z-10 cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-purple-400"
        />
      ) : null}

      {advertisedVideo && hasPlayableVideo ? (
        <span className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.55] pointer-events-none absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600/30 text-white shadow">
          <Icon name={focused ? 'IC-focus-exit' : 'IC-expand'} className="h-5 w-5 fill-current" />
        </span>
      ) : null}

      {onDisconnect ? (
        <button
          type="button"
          aria-label={lang?.community_disconnect_voice || 'Отключить от звонка'}
          title={lang?.community_disconnect_voice || 'Отключить от звонка'}
          onClick={(event) => {
            event.stopPropagation();
            onDisconnect();
          }}
          className="glass-panel [--glass-tint:var(--color-red-600)] [--glass-alpha:0.8] absolute left-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-red-400/30 text-white shadow duration-300 hover:[--glass-tint:var(--color-red-500)] hover:[--glass-alpha:1] focus-visible:outline-2 focus-visible:outline-red-300 active:scale-95"
        >
          <Icon name="IC-exit" className="h-5 w-5 fill-current" aria-hidden="true" />
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-9">
        <span className="min-w-0 truncate text-sm font-medium text-white">
          {displayName}{isLocal ? ` (${lang?.you || 'Вы'})` : ''}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          {participant.screen_enabled ? (
            <span className="rounded-full border border-purple-400/30 bg-purple-600/90 px-3 py-1.5 text-[10px] font-semibold text-white">
              {lang?.screen_share || 'Экран'}
            </span>
          ) : null}
          <span
            title={participant.mic_enabled ? (lang?.voice_mute || 'Микрофон') : (lang?.voice_unmute || 'Микрофон выключен')}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${participant.mic_enabled ? 'border-green-400/30 bg-green-600/90 text-white' : 'border-red-400/30 bg-red-600/90 text-white'}`}
          >
            <Icon name={!participant.mic_enabled ? 'IC-call-mic-off' : 'IC-call-mic'} className="size-4 fill-current" />
          </span>
        </div>
      </div>
    </article>
  );
}
