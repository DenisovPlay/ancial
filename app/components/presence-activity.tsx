'use client';
/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { cn } from '../lib/cn';
import { getPresenceText, isPresenceOnline, type UserPresence } from '../lib/presence';
import { Dropdown, DropdownItem } from './navigation';

const ACTIVITY_ICONS: Record<string, string> = {
  call: 'IC-call',
  chat: 'IC-chats',
  music: 'IC-music',
  page: 'IC-compass',
};

/**
 * Значок активности на аватарке профиля — в пару к кнопке смены аватарки. Сервер уже отфильтровал
 * всё по настройкам приватности (свою активность владелец видит всегда). По клику — что именно
 * происходит и действия: «Включить» трек, «Присоединиться» к групповому звонку, «Открыть».
 * «Не в сети» и «В сети» без активности не показываем: это и так видно по кольцу аватарки.
 */
export default function PresenceActivity({ presence }: { presence: UserPresence | null | undefined }) {
  const router = useRouter();
  const { lang } = useAuth();
  const { playTrack } = usePulsePlayer();

  if (!presence || !isPresenceOnline(presence)) return null;
  const icon = ACTIVITY_ICONS[presence.activity_type];
  if (!icon) return null;

  const isMusic = presence.activity_type === 'music';
  const cover = isMusic ? presence.activity_meta?.cover : '';
  const songId = isMusic ? presence.activity_meta?.song_id : '';
  const activityUrl = presence.activity_url || '';
  const canJoinCall = presence.activity_type === 'call' && presence.can_join && activityUrl;
  const text = getPresenceText(presence, lang);

  return (
    <Dropdown
      position="bottom"
      align="start"
      width="auto"
      triggerSize="sm"
      triggerAriaLabel={text}
      triggerClassName="overflow-hidden p-0 shadow"
      triggerNode={
        <span
          title={text}
          className={cn(
            'flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-zinc-600/30 bg-zinc-800/80 backdrop-blur-lg',
            isMusic && 'ring-2 ring-purple-500',
          )}
        >
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg className="h-5 w-5 fill-white" viewBox="0 0 48 48">
              <use href={`#${icon}`}></use>
            </svg>
          )}
        </span>
      }
      menuClassName="min-w-[14rem] max-w-[18rem]"
    >
      <div className="px-3 py-1.5 text-sm text-zinc-200">{text}</div>
      {songId ? (
        <DropdownItem icon="IC-play" onClick={() => void playTrack(songId)}>
          {lang?.presence_play_track || 'Включить'}
        </DropdownItem>
      ) : null}
      {canJoinCall ? (
        <DropdownItem icon="IC-call" onClick={() => router.push(activityUrl)}>
          {lang?.presence_join_call || 'Присоединиться'}
        </DropdownItem>
      ) : null}
      {isMusic && activityUrl ? (
        <DropdownItem icon="IC-link" onClick={() => router.push(activityUrl)}>
          {lang?.open || 'Открыть'}
        </DropdownItem>
      ) : null}
    </Dropdown>
  );
}
