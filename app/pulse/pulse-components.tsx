'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import React, { useState } from 'react';

import Modal from '../components/modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import { useAuth, type User } from '../context/AuthContext';
import { canManagePulseTrack, getPulseTrackDropdownZIndex } from './playlist/playlist-model';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from './pulse-image';

export type PulseTrackArtwork = {
  src?: string | null;
};

export type PulseTrack = {
  album?: string | null;
  albumid?: number | string | null;
  artist?: string | null;
  artists_ids?: string[] | string | null;
  artwork?: PulseTrackArtwork[] | null;
  blockedin?: string[] | string | null;
  explicit?: boolean | number | string | null;
  lang?: string | null;
  listens?: number | string | null;
  mood?: string | null;
  sid?: number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
  uploaded_by?: number | string | null;
};

export type PulsePlaylistCardData = {
  creator?: string | null;
  desk?: string | null;
  genlist?: string | null;
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
  type?: number | string | null;
};

export type PulseArtistCardData = {
  desk?: string | null;
  id?: number | string | null;
  img?: string | null;
  name?: string | null;
  verify?: number | string | null;
};

export type PulseTrackRowProps = {
  currentSongId: number;
  favoriteIds: number[];
  isAuthenticated: boolean;
  onAddToPlaylist: (trackId: number | string) => void;
  onCopyTrackLink: (trackId: number | string, track?: PulseTrack) => Promise<void>;
  onDeleteTrack?: (track: PulseTrack) => void;
  onEditTrack?: (track: PulseTrack) => void;
  onLikeTrack: (track: PulseTrack) => Promise<void>;
  onOpenArtist: (artistId: string) => void;
  onPlayTrack: (track: PulseTrack, index: number) => void;
  onQueueTrackNext: (trackId: number | string) => Promise<void>;
  onReportTrack?: (track: PulseTrack) => Promise<void> | void;
  track: PulseTrack;
  trackIndex: number;
  user: User | null;
  userCountry: string;
};

export const DEFAULT_TRACK_IMAGE = '/includes/img/pulse/track.png';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export function decodeHtmlEntities(value: string | null | undefined) {
  const nextValue = normalizeText(value);
  if (!nextValue || typeof window === 'undefined') {
    return nextValue;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = nextValue;
  return textarea.value;
}

export function getImageUrl(value: string | null | undefined, fallback = DEFAULT_TRACK_IMAGE) {
  const nextValue = normalizeText(value);
  return nextValue || fallback;
}

export function getTrackArtwork(track: PulseTrack) {
  const artwork = Array.isArray(track.artwork) ? track.artwork : [];
  const cover = artwork.find((item) => normalizeText(item?.src));
  return getImageUrl(cover?.src, DEFAULT_TRACK_IMAGE);
}

export function getArtistIds(track: PulseTrack) {
  if (Array.isArray(track.artists_ids)) {
    return track.artists_ids.map((artistId) => normalizeText(artistId)).filter(Boolean);
  }

  return normalizeText(String(track.artists_ids ?? ''))
    .split(/[|,]/)
    .map((artistId) => normalizeText(artistId))
    .filter(Boolean);
}

export function isTrackExplicit(track: PulseTrack) {
  return track.explicit === true || String(track.explicit ?? '') === '1';
}

function getBlockedCountries(blockedIn: PulseTrack['blockedin']) {
  if (Array.isArray(blockedIn)) {
    return blockedIn.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(String(blockedIn ?? ''))
    .split(/[|,]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

export function isTrackAvailable(track: PulseTrack, userCountry: string) {
  if (String(track.status ?? '0') !== '1') {
    return false;
  }

  const blockedCountries = getBlockedCountries(track.blockedin);
  if (!blockedCountries.length) {
    return true;
  }

  return !blockedCountries.includes(userCountry);
}

export function PulseLogo({ className }: { className?: string }) {
  return (
    <img src="/img/branding/pulse.svg" alt="Pulse Logo" className={cn('shrink-0', className)} />
  );
}

export function ActionIcon({ name, className }: { className?: string; name: string }) {
  return (
    <svg className={cn('inline fill-white', className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`#${name}`} />
    </svg>
  );
}

export function PulsePageHeader({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
      <div className="w-full max-w-screen-2xl px-3 lg:px-0">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
        >
          <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
          <PulseLogo className="w-32 sm:w-48" />
        </button>
      </div>
    </div>
  );
}

export function PulseSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('w-full max-w-screen-2xl px-3 text-2xl font-black cutetext lg:px-0 lg:text-3xl xl:text-4xl', className)}>
      {children}
    </span>
  );
}

export function PulsePlaylistTileSkeleton({
  variant = 'compact',
}: {
  variant?: 'big' | 'compact';
}) {
  return (
    <div
      className={cn(
        'shrink-0 animate-pulse overflow-hidden rounded-2xl border border-zinc-600/30 bg-zinc-800 shadow',
        variant === 'big' ? 'aspect-square w-full' : 'h-32 w-32 lg:h-48 lg:w-48',
      )}
    />
  );
}

export function PulseArtistTileSkeleton() {
  return (
    <div className="h-32 w-32 shrink-0 animate-pulse overflow-hidden rounded-full border border-zinc-600/30 bg-zinc-800 shadow lg:h-48 lg:w-48" />
  );
}

export function PulseEmptyState({
  description,
  title,
}: {
  description?: string;
  title?: string;
}) {
  const { lang } = useAuth();
  return (
    <div className="flex min-h-72 w-full flex-col items-center justify-center gap-1 text-center">
      <PulseLogo className="w-48" />
      <span className="text-xl text-zinc-300">{title || lang?.empty || 'Пусто'}</span>
      {description ? (
        <span className="text-lg text-zinc-500">{description}</span>
      ) : null}
    </div>
  );
}

export function PulsePlaylistTile({
  card,
  isPlaying,
  onOpen,
  onPlay,
  variant = 'compact',
}: {
  card: PulsePlaylistCardData;
  isPlaying: boolean;
  onOpen: () => void;
  onPlay: () => void;
  variant?: 'big' | 'compact';
}) {
  const { lang } = useAuth();
  const coverUrl = getImageUrl(card.img, DEFAULT_TRACK_IMAGE);
  const title = decodeHtmlEntities(card.name) || lang?.untitled || 'Без названия';
  const description = decodeHtmlEntities(card.desk) || 'Pulse';
  const playButtonSize = variant === 'big' ? 'h-10 w-10 lg:h-14 lg:w-14' : 'h-10 w-10';
  const playIconSize = variant === 'big' ? 'h-6 w-6' : 'h-6 w-6';
  const titleWidth = variant === 'big' ? 'w-28 lg:w-32' : 'w-28';
  const titleTextClass = variant === 'big' ? 'text-sm lg:text-lg' : 'text-sm';
  const descriptionTextClass = variant === 'big' ? 'hidden text-xs text-zinc-300 lg:flex lg:text-base' : 'hidden text-xs text-zinc-300 lg:flex';

  return (
    <div
      className={cn(
        'group relative shrink-0 overflow-hidden rounded-2xl border border-zinc-600/30 shadow duration-300 active:scale-95',
        variant === 'big' ? 'aspect-square w-full' : 'h-32 w-32 lg:h-48 lg:w-48',
      )}
    >
      <button type="button" onClick={onOpen} className="h-full w-full cursor-pointer">
        <PulseCoverImage
          alt={title}
          className="duration-300 group-hover:scale-105"
          sizes={variant === 'big' ? PULSE_COVER_IMAGE_SIZES.playlistTileBig : PULSE_COVER_IMAGE_SIZES.playlistTile}
          src={coverUrl}
        />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex w-full items-end gap-1 bg-gradient-to-t from-black via-black/90 to-transparent p-1 opacity-0 duration-300 group-hover:opacity-100 lg:gap-3 lg:p-3">
        <button
          type="button"
          onClick={onPlay}
          className={cn('flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-purple-500/50 shadow backdrop-blur-md backdrop-saturate-200 duration-300 hover:bg-purple-600 active:scale-95', playButtonSize)}
          aria-label={isPlaying ? 'Pause playlist' : 'Play playlist'}
        >
          <ActionIcon className={playIconSize} name={isPlaying ? 'IC-pause' : 'IC-play'} />
        </button>

        <div className="flex min-w-0 flex-col gap-0 text-left">
          <span className={cn('truncate font-medium text-white', titleTextClass, titleWidth)}>{title}</span>
          <span className={descriptionTextClass}>{description}</span>
        </div>
      </div>
    </div>
  );
}

export function PulseArtistTile({
  artist,
  onOpen,
}: {
  artist: PulseArtistCardData;
  onOpen: () => void;
}) {
  const { lang } = useAuth();
  const imageUrl = getImageUrl(artist.img, DEFAULT_TRACK_IMAGE);
  const name = decodeHtmlEntities(artist.name) || lang?.artist || 'Артист';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex cursor-pointer flex-col items-center justify-center duration-300 active:scale-95"
    >
      <div className="relative z-[2] h-32 w-32 overflow-hidden rounded-full opacity-0 blur-sm duration-300 group-hover:opacity-100 lg:h-48 lg:w-48">
        <div className="h-full w-full bg-cover bg-center duration-300 group-hover:scale-110" style={{ backgroundImage: `url(${imageUrl})` }} />
      </div>

      <div className="absolute top-0 z-[4] h-32 w-32 overflow-hidden rounded-full border border-zinc-600/30 shadow lg:h-48 lg:w-48">
        <div className="h-full w-full bg-cover bg-center duration-300 group-hover:scale-110" style={{ backgroundImage: `url(${imageUrl})` }} />
      </div>

      <span className="z-[1] flex max-w-32 items-center gap-1 truncate text-sm font-medium text-zinc-100 duration-300 lg:-translate-y-24 lg:max-w-48 lg:group-hover:translate-y-0">
        <span className="truncate">{name}</span>
      </span>
    </button>
  );
}

export function TracksPanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-zinc-800" />
          <div className="flex flex-grow flex-col gap-2">
            <div className="h-4 w-2/3 rounded-full bg-zinc-800" />
            <div className="h-3 w-1/3 rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function getPulseBackgroundColorByMood(mood: string | null | undefined): string {
  const normalizedMood = mood?.toLowerCase().trim() || '';

  switch (normalizedMood) {
    case 'happy':
      return 'bg-amber-500/25';
    case 'sad':
      return 'bg-blue-500/25';
    case 'funny':
      return 'bg-orange-500/25';
    case 'energetic':
      return 'bg-red-500/25';
    case 'calm':
      return 'bg-teal-500/25';
    case 'romantic':
      return 'bg-rose-500/25';
    case 'dark':
      return 'bg-zinc-500/25';
    case 'aggressive':
      return 'bg-red-600/25';
    case 'dreamy':
      return 'bg-indigo-500/25';
    case 'chill':
      return 'bg-cyan-500/25';
    case 'sexy':
      return 'bg-fuchsia-500/25';
    case 'scary':
      return 'bg-stone-600/25';
    default:
      return 'bg-pink-500/25';
  }
}

export function PulseTrackRow({
  currentSongId,
  favoriteIds,
  isAuthenticated,
  onAddToPlaylist,
  onCopyTrackLink,
  onDeleteTrack,
  onEditTrack,
  onLikeTrack,
  onOpenArtist,
  onPlayTrack,
  onQueueTrackNext,
  onReportTrack,
  track,
  trackIndex,
  user,
  userCountry,
}: PulseTrackRowProps) {
  const { lang } = useAuth();
  const trackId = toNumber(track.sid);
  const isCurrentSong = currentSongId > 0 && currentSongId === trackId;
  const isOwnTrack = canManagePulseTrack(track, user);
  const isLiked = trackId > 0 && favoriteIds.includes(trackId);
  const isAvailable = isTrackAvailable(track, userCountry);
  const firstArtistId = getArtistIds(track)[0] ?? '';
  const coverUrl = getTrackArtwork(track);
  const title = decodeHtmlEntities(track.title) || lang?.untitled || 'Без названия';
  const artist = decodeHtmlEntities(track.artist) || lang?.unknown_artist || 'Неизвестный исполнитель';
  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);
  const trackMenuZIndex = getPulseTrackDropdownZIndex(trackIndex, isTrackMenuOpen);
  const manageActions = [
    isAuthenticated && isOwnTrack && onEditTrack
      ? {
          icon: 'IC-edit',
          key: 'edit',
          label: lang?.edit || 'Изменить',
          onClick: () => onEditTrack(track),
        }
      : null,
    isAuthenticated && isOwnTrack && onDeleteTrack
      ? {
          icon: 'IC-trash',
          key: 'delete',
          label: lang?.delete || 'Удалить',
          onClick: () => onDeleteTrack(track),
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: string;
    key: string;
    label: string;
    onClick: () => void;
  }>;
  const footerActions = [
    firstArtistId
      ? {
          icon: 'IC-user',
          key: 'artist',
          label: lang?.artist || 'Исполнитель',
          onClick: () => onOpenArtist(firstArtistId),
        }
      : null,
    {
      icon: 'IC-share',
      key: 'share',
      label: lang?.share || 'Поделиться',
      onClick: () => onCopyTrackLink(trackId, track),
    },
    onReportTrack
      ? {
          icon: 'IC-report',
          key: 'report',
          label: lang?.report || 'Пожаловаться',
          onClick: () => void onReportTrack(track),
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: string;
    key: string;
    label: string;
    onClick: () => void;
  }>;

  return (
    <div className={cn('rounded-2xl flex items-center gap-3 duration-300', isAvailable ? 'group cursor-pointer hover:bg-zinc-800 hover:pr-3' : 'group', isCurrentSong && 'bg-lime-500/10 pr-3')}>
      <button
        type="button"
        onClick={() => onPlayTrack(track, trackIndex)}
        disabled={!isAvailable}
        className={cn('relative h-16 w-16 shrink-0 cursor-pointer', !isAvailable && 'cursor-not-allowed')}
      >
        {isOwnTrack ? (
          <ActionIcon
            className="absolute -left-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-zinc-600/30 bg-pink-500/50 stroke-white p-1 backdrop-blur-sm backdrop-saturate-200"
            name="IC-crown"
          />
        ) : null}

        <PulseCoverImage
          alt={`${title} cover`}
          className="rounded-2xl"
          sizes={PULSE_COVER_IMAGE_SIZES.trackRow}
          src={coverUrl}
        />

        {isTrackExplicit(track) ? (
          <div className="group absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800/50 p-1 text-xs text-white duration-300 backdrop-blur-sm backdrop-saturate-200 hover:w-fit">
            <span className="group-hover:hidden">E</span>
            <span className="hidden group-hover:inline">18+</span>
          </div>
        ) : null}
      </button>

      <button type="button" onClick={() => onPlayTrack(track, trackIndex)} disabled={!isAvailable} className={cn('min-w-0 flex-grow cursor-pointer text-left', !isAvailable && 'cursor-not-allowed')}>
        <span className="block truncate text-sm font-medium text-white md:text-base lg:text-lg">
          {isAvailable ? title : `${title} - ${artist}`}
        </span>
        <span className="block truncate text-xs text-zinc-300 lg:text-sm">
          {isAvailable ? artist : (lang?.track_unavailable || 'Трек недоступен')}
        </span>
      </button>

      {isAuthenticated ? (
        <button type="button" onClick={() => void onLikeTrack(track)} className="cursor-pointer active:scale-95">
          <ActionIcon className={cn('h-6 w-6 duration-300 hover:fill-zinc-300 lg:h-8 lg:w-8', isLiked ? 'fill-white' : 'fill-zinc-100')} name={isLiked ? 'IC-heart-filled' : 'IC-heart'} />
        </button>
      ) : null}

      <Dropdown
        position="bottom"
        align="end"
        triggerSize="sm"
        menuClassName="min-w-[12rem] !gap-1.5"
        onOpenChange={setIsTrackMenuOpen}
        open={isTrackMenuOpen}
        wrapperClassName="relative"
        wrapperStyle={{ zIndex: trackMenuZIndex }}
      >
        {manageActions.length ? (
          <div className="grid w-full grid-cols-2 gap-1.5">
            {manageActions.map((action) => (
              <button
                key={action.key}
                type="button"
                aria-label={action.label}
                onClick={action.onClick}
                className="flex h-10 w-full cursor-pointer items-center justify-center rounded-3xl border border-transparent bg-zinc-700/0 text-white duration-150 hover:border-zinc-600/30 hover:bg-zinc-700/95 hover:shadow active:scale-95"
              >
                <ActionIcon className="h-6 w-6" name={action.icon} />
              </button>
            ))}
          </div>
        ) : null}
        <DropdownItem icon="IC-chart-hor" onClick={() => void onQueueTrackNext(track.sid ?? 0)}>
          {lang?.play_next || 'Следующим'}
        </DropdownItem>
        {isAuthenticated ? (
          <DropdownItem icon="IC-plus" onClick={() => onAddToPlaylist(track.sid ?? 0)}>
            {lang?.add_to_playlist || 'В плейлист'}
          </DropdownItem>
        ) : null}
        <DropdownItem icon="IC-download" onClick={() => window.open(normalizeText(track.src), '_blank', 'noopener,noreferrer')}>
          {lang?.download || 'Скачать'}
        </DropdownItem>
        <div className={cn('grid w-full gap-1.5', footerActions.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>
          {footerActions.map((action) => (
            <button
              key={action.key}
              type="button"
              aria-label={action.label}
              onClick={action.onClick}
              className="flex h-10 w-full cursor-pointer items-center justify-center rounded-3xl border border-transparent bg-zinc-700/0 text-white duration-150 hover:border-zinc-600/30 hover:bg-zinc-700/95 hover:shadow active:scale-95"
            >
              <ActionIcon className="h-6 w-6" name={action.icon} />
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}

export function PulseLegalFooter({ className }: { className?: string }) {
  return (
    <div className={cn('flex w-full max-w-screen-2xl flex-col items-center justify-center gap-1.5 px-3 lg:px-0', className)}>
      <div className="flex w-full flex-col items-center justify-center gap-1.5 lg:flex-row">
        <span className="cutetext text-4xl font-bold text-white">18+</span>
        <span className="text-center text-sm text-zinc-400">
          <span className="font-bold text-purple-500">Pulse</span> - информационный посредник (ст. 15.1 Федерального закона № 149-ФЗ), платформа для загрузки и прослушивания аудиофайлов пользователями. Может содержаться контент с возрастным ограничением 18+, отмечен символом &quot;E&quot;.
          <br />
          Администрация не размещает контент самостоятельно, не модерирует его заранее и не несёт ответственности за правомерность материалов.
          <br />
          Уведомления о нарушениях авторских прав, пропаганде наркотиков или иной противоправной информации направляйте на{' '}
          <a
            className="cursor-pointer text-sm text-zinc-200 duration-300 hover:text-zinc-300 active:scale-95"
            href="mailto:contact@ancial.ru?subject=[Копирайт]"
          >
            contact@ancial.ru
          </a>{' '}
          с темой &quot;[Копирайт]&quot; или &quot;[Противоправная информация]&quot; - блокируем в течение 24 часов с момента получения обоснованного требования, если нам не требуются пояснения. Более подробная информация расположена на{' '}
          <Link
            href="/about/legal"
            className="cursor-pointer text-sm text-zinc-200 duration-300 hover:text-zinc-300 active:scale-95"
          >
            ancial.ru/legal/
          </Link>{' '}
          в разделе &quot;Правила&quot;.
          <br />
          <span className="uppercase text-amber-400">
            Публичная информация о наркотических средствах и/или их использовании опасна и незаконна: пропаганда и/или употребление наркотических средств причиняет вред здоровью, незаконный оборот наркотических средств запрещён и влечёт установленную законодательством Российской Федерации ответственность.
            <br />
            С 1 марта 2026 года действует Федеральный закон от 08.08.2024 №224-ФЗ &quot;О внесении изменений в статьи 1 и 46 Федерального закона &quot;О наркотических средствах и психотропных веществах&quot; и отдельные законодательные акты Российской Федерации&quot;. Закон ужесточает нормы о запрете пропаганды незаконных оборота и потребления наркотиков, психотропных веществ, их аналогов и прекурсоров, а также культивирования наркосодержащих растений.
          </span>
        </span>
      </div>
    </div>
  );
}

export function PulseReportModal({
  isOpen,
  onClose,
  onSelectReason,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectReason: (reason: string) => void | Promise<void>;
  title?: string;
}) {
  const { lang } = useAuth();
  const reasons = [
    { label: lang?.report_spam || 'Спам', value: 'Спам' },
    { label: lang?.report_illegal_item || 'Запрещённый товар', value: 'Запрещённый товар' },
    { label: lang?.report_fraud || 'Обман', value: 'Обман' },
    { label: lang?.report_violence || 'Насилие и вражда', value: 'Насилие и вражда' },
    { label: lang?.report_explicit || 'Откровенное изображение', value: 'Откровенное изображение' },
    { label: lang?.report_copyright || 'Нарушение интеллектуальных прав', value: 'Нарушение интеллектуальных прав' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || lang?.report || 'Пожаловаться'}
      width="sm"
    >
      <div className="flex flex-col justify-center overflow-hidden rounded-3xl shadow">
        {reasons.map((reason) => (
          <button
            key={reason.value}
            type="button"
            onClick={() => {
              void onSelectReason(reason.value);
            }}
            className="cursor-pointer bg-zinc-800 p-1.5 text-left text-lg duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {reason.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
