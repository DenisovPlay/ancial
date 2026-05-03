'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import React from 'react';

import { Dropdown, DropdownItem } from '../components/navigation';
import type { User } from '../context/AuthContext';

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
  sid?: number | string | null;
  src?: string | null;
  status?: number | string | null;
  title?: string | null;
  uploaded_by?: number | string | null;
};

export type PulseTrackRowProps = {
  currentSongId: number;
  favoriteIds: number[];
  isAuthenticated: boolean;
  onAddToPlaylist: (trackId: number | string) => void;
  onCopyTrackLink: (trackId: number | string) => Promise<void>;
  onLikeTrack: (track: PulseTrack) => Promise<void>;
  onOpenArtist: (artistId: string) => void;
  onPlayTrack: (track: PulseTrack, index: number) => void;
  onQueueTrackNext: (trackId: number | string) => Promise<void>;
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
      <use href={`/icons.svg#${name}`} />
    </svg>
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

export function PulseTrackRow({
  currentSongId,
  favoriteIds,
  isAuthenticated,
  onAddToPlaylist,
  onCopyTrackLink,
  onLikeTrack,
  onOpenArtist,
  onPlayTrack,
  onQueueTrackNext,
  track,
  trackIndex,
  user,
  userCountry,
}: PulseTrackRowProps) {
  const trackId = toNumber(track.sid);
  const isCurrentSong = currentSongId > 0 && currentSongId === trackId;
  const isOwnTrack = toNumber(track.uploaded_by) > 0 && toNumber(track.uploaded_by) === toNumber(user?.id);
  const isLiked = trackId > 0 && favoriteIds.includes(trackId);
  const isAvailable = isTrackAvailable(track, userCountry);
  const firstArtistId = getArtistIds(track)[0] ?? '';
  const coverUrl = getTrackArtwork(track);
  const title = decodeHtmlEntities(track.title) || 'Без названия';
  const artist = decodeHtmlEntities(track.artist) || 'Неизвестный исполнитель';

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

        <img src={coverUrl} alt={`${title} cover`} className="h-full w-full rounded-2xl object-cover" />

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
          {isAvailable ? artist : 'Трек недоступен'}
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
        menuClassName="min-w-[12rem]"
        wrapperClassName="relative z-20"
      >
        {isAuthenticated ? (
          <DropdownItem icon="IC-chart-hor" onClick={() => void onQueueTrackNext(track.sid ?? 0)}>
            Следующим
          </DropdownItem>
        ) : null}
        {isAuthenticated ? (
          <DropdownItem icon="IC-plus" onClick={() => onAddToPlaylist(track.sid ?? 0)}>
            В плейлист
          </DropdownItem>
        ) : null}
        <DropdownItem icon="IC-download" onClick={() => window.open(normalizeText(track.src), '_blank', 'noopener,noreferrer')}>
          Скачать
        </DropdownItem>
        {firstArtistId ? (
          <DropdownItem icon="IC-me" onClick={() => onOpenArtist(firstArtistId)}>
            Исполнитель
          </DropdownItem>
        ) : null}
        <DropdownItem icon="IC-share" onClick={() => void onCopyTrackLink(track.sid ?? 0)}>
          Поделиться
        </DropdownItem>
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
