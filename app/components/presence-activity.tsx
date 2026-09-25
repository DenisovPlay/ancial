'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { cn } from '../lib/cn';
import { getPresenceMusicLabel, getPresenceText, isPresenceOnline, type UserPresence } from '../lib/presence';
import { getPulseExternalUrl } from '../pulse/pulse-navigation';
import { Dropdown, DropdownItem } from './navigation';
import ShareModal from './share-modal';
import AppImage from './app-image';
import Icon from './svg-icon';

/**
 * Маленькая обложка играющего трека на аватарке в списках (чаты, друзья, виджет друзей).
 * Без меню: клик по строке списка и так ведёт в чат/профиль. Показывается только при музыке.
 */
export function PresenceCoverBadge({ className, presence }: { className?: string; presence: UserPresence | null | undefined }) {
  const { lang } = useAuth();
  if (!presence || !isPresenceOnline(presence) || presence.activity_type !== 'music') return null;

  const cover = presence.activity_meta?.cover;
  return (
    <span
      title={getPresenceText(presence, lang)}
      className={cn('flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-900 bg-purple-500 shadow', className)}
    >
      {cover ? (
        <AppImage width={48} height={48} src={cover} alt="" className="h-full w-full object-cover" />
      ) : (
        <Icon name="IC-music" className="h-3.5 w-3.5 fill-white" />
      )}
    </span>
  );
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: 'IC-call',
  chat: 'IC-chats',
  music: 'IC-music',
  page: 'IC-compass',
};

// Как ряд «Изменить / Удалить» в меню постов: иконки в одну строку.
const MENU_ICON_BUTTON = 'flex h-10 w-full cursor-pointer items-center justify-center rounded-3xl border border-transparent bg-zinc-700/0 text-white duration-150 hover:border-zinc-600/30 hover:bg-zinc-700/95 hover:shadow active:scale-95';
const GRID_COLUMNS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

type MenuAction = { icon: string; key: string; label: string; onClick: () => void };

/**
 * Значок активности на аватарке профиля — в пару к кнопке смены аватарки. Сервер уже отфильтровал
 * всё по настройкам приватности (свою активность владелец видит всегда). По клику — что именно
 * происходит и действия: для музыки «Включить», «Открыть», «Поделиться»; для группового звонка —
 * «Присоединиться». «Не в сети» и «В сети» без активности не показываем: это видно по кольцу аватарки.
 */
export default function PresenceActivity({
  presence,
  userId,
}: {
  presence: UserPresence | null | undefined;
  /** ID хозяина активности; задан — можно подключиться к его прослушиванию (на своей странице не нужно). */
  userId?: number | string;
}) {
  const router = useRouter();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const { joinListenAlong, playTrack } = usePulsePlayer();
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (!presence || !isPresenceOnline(presence)) return null;
  const icon = ACTIVITY_ICONS[presence.activity_type];
  if (!icon) return null;

  const isMusic = presence.activity_type === 'music';
  const meta = presence.activity_meta;
  const cover = isMusic ? meta?.cover : '';
  const songId = isMusic ? meta?.song_id : '';
  const activityUrl = presence.activity_url || '';
  const canJoinCall = presence.activity_type === 'call' && presence.can_join && activityUrl;
  const text = getPresenceText(presence, lang);
  // В меню — заголовок жирным, а трек/звонок отдельной строкой под ним.
  const menuTitle = isMusic
    ? (lang?.presence_listening || 'Слушает')
    : presence.activity_type === 'call' && presence.activity_label
      ? (lang?.presence_calling || 'Участвует в звонке')
      : '';
  const menuDetail = isMusic
    ? getPresenceMusicLabel(presence)
    : menuTitle
      ? presence.activity_label
      : '';
  const shareUrl = isMusic && activityUrl ? getPulseExternalUrl(activityUrl) : '';

  const musicActions: MenuAction[] = [];
  if (songId) {
    musicActions.push({ icon: 'IC-play', key: 'play', label: lang?.presence_play_track || 'Включить', onClick: () => void playTrack(songId) });
  }
  if (isMusic && activityUrl) {
    musicActions.push({ icon: 'IC-link', key: 'open', label: lang?.open || 'Открыть', onClick: () => router.push(activityUrl) });
  }
  if (shareUrl) {
    musicActions.push({ icon: 'IC-share', key: 'share', label: lang?.share || 'Поделиться', onClick: () => setIsShareOpen(true) });
  }
  // Он сам слушает вместе с кем-то — своей очередью не управляет, подключаться к нему некуда.
  const isFollowingSomeone = isMusic && Number(meta?.listen_host_id) > 0;
  if (isMusic && Number(userId) > 0 && !isFollowingSomeone) {
    musicActions.push({
      icon: 'IC-speaker',
      key: 'listen-along',
      label: lang?.listen_along || 'Слушать вместе',
      onClick: () => joinListenAlong(Number(userId)),
    });
  }

  return (
    <>
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
              'glass-panel [--glass-tint:var(--color-zinc-800)] [--glass-alpha:0.8] [--glass-blur:16px] flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-zinc-600/30',
              isMusic && 'ring-2 ring-purple-500',
            )}
          >
            {cover ? (
              <AppImage width={48} height={48} src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon name={icon} className="h-5 w-5 fill-white" />
            )}
          </span>
        }
        menuClassName="!mt-1.5 !min-w-[min(14rem,calc(100vw-1.5rem))] !w-max !max-w-[min(18rem,calc(100vw-1.5rem))]"
      >
        {menuTitle ? (
          <div className="flex flex-col px-3 py-1.5 text-sm break-words">
            <span className="font-bold text-white">{menuTitle}</span>
            <span className="text-zinc-300">{menuDetail}</span>
          </div>
        ) : (
          <div className="px-3 py-1.5 text-sm text-zinc-200 break-words">{text}</div>
        )}
        {musicActions.length > 0 ? (
          <div className={cn('grid w-full gap-1.5', GRID_COLUMNS[Math.min(musicActions.length, GRID_COLUMNS.length - 1)])}>
            {musicActions.map((action) => (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                title={action.label}
                onClick={action.onClick}
                className={MENU_ICON_BUTTON}
              >
                <Icon name={action.icon} className="h-6 w-6 fill-white" />
              </button>
            ))}
          </div>
        ) : null}
        {canJoinCall ? (
          <DropdownItem icon="IC-call" onClick={() => router.push(activityUrl)}>
            {lang?.presence_join_call || 'Присоединиться'}
          </DropdownItem>
        ) : null}
      </Dropdown>

      {shareUrl ? (
        <ShareModal
          copyLabel={lang?.copylink || 'Скопировать ссылку'}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onCopied={() => showNote({ content: lang?.linkcopied || 'Ссылка скопирована', type: 'success', time: 3 })}
          onCopyFailed={() => showNote({ content: shareUrl, type: 'info', time: 5 })}
          shareUrl={shareUrl}
          title={lang?.share || 'Поделиться'}
          attachmentWidgets={songId ? [{ type: 'music', track_id: songId }] : undefined}
          attachmentPreview={{
            authorName: meta?.artist || lang?.artist || 'Исполнитель',
            authorImg: cover || '/img/noimg.png',
            contentSnippet: meta?.title || lang?.untitled || 'Без названия',
          }}
        />
      ) : null}
    </>
  );
}
