'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dropdown, DropdownItem } from '../../../components/navigation';
import ShareModal from '../../../components/share-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import { PULSE_COVER_IMAGE_SIZES, PulseCoverImage } from '../../pulse-image';
import {
  ActionIcon,
  DEFAULT_TRACK_IMAGE,
  PulseEmptyState,
  PulseLegalFooter,
  PulsePageHeader,
  PulseTrack,
  PulseTrackRow,
  TrackCollectionPanel,
  cn,
  decodeHtmlEntities,
  getImageUrl,
  getTrackArtwork,
  normalizeText,
  toNumber,
} from '../../pulse-components';
import { getPulseExternalUrl } from '../../pulse-navigation';
import { PulseHeader } from '../../pulse-header';

type PulseTrackPageTrack = {
  artist?: string | null;
  blockedin?: string[] | string | null;
  id?: number | string | null;
  img?: string | null;
  listens?: number | string | null;
  name?: string | null;
  src?: string | null;
  status?: number | string | null;
};

type PulseTrackPageResponse = {
  is_liked?: boolean;
  track?: PulseTrackPageTrack | null;
};

function getBlockedCountries(blockedIn: PulseTrackPageTrack['blockedin']) {
  if (Array.isArray(blockedIn)) {
    return blockedIn.map((item) => normalizeText(item)).filter(Boolean);
  }

  return normalizeText(String(blockedIn ?? ''))
    .split(/[|,]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function isTrackAvailable(track: PulseTrackPageTrack | null, userCountry: string) {
  if (!track || String(track.status ?? '0') !== '1') return false;
  return !getBlockedCountries(track.blockedin).includes(userCountry);
}

export default function PulseTrackContent({ trackId: rawTrackId }: { trackId: string }) {
  const router = useRouter();
  const { isAuthenticated, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentSongId,
    isPlaying,
    openAddToPlaylist,
    playTrack,
    togglePlay,
  } = usePulsePlayer();
  const trackId = normalizeText(rawTrackId) || '0';
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<PulseTrackPageTrack | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [similarTracks, setSimilarTracks] = useState<PulseTrack[] | null>(() => {
    const cached = cache.get<PulseTrack[]>(`similar_tracks_${trackId}`, { category: 'pulse' });
    return Array.isArray(cached) ? cached : null;
  });
  const [isSimilarLoading, setIsSimilarLoading] = useState(!similarTracks);

  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    const cachedFavoriteIds = cache.get<number[]>('pulse_fav_ids', { category: 'pulse' });
    return Array.isArray(cachedFavoriteIds)
      ? cachedFavoriteIds.map((id) => toNumber(id)).filter(Boolean)
      : [];
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<any>(null);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );

    return nextCountry || 'RU';
  }, [user?.country]);

  const trackNumericId = toNumber(track?.id ?? trackId);
  const available = isTrackAvailable(track, userCountry);
  const title = decodeHtmlEntities(track?.name) || (lang?.untitled || 'Неизвестный трек');
  const artist = decodeHtmlEntities(track?.artist) || (lang?.unknown_artist || 'Неизвестный исполнитель');
  const image = getImageUrl(track?.img, DEFAULT_TRACK_IMAGE);
  const active = trackNumericId > 0 && currentSongId === trackNumericId && isPlaying;

  const showPulseNote = useCallback((content: string, type: 'error' | 'info' | 'success' = 'info', time = 4) => {
    showNote({ content, time, type });
  }, [showNote]);

  useEffect(() => {
    let cancelled = false;

    void AncialAPI.pulseGetTrack<PulseTrackPageResponse>(trackId)
      .then((result) => {
        if (cancelled) return;
        setTrack(result.track ?? null);
        setIsLiked(Boolean(result.is_liked));
      })
      .catch(() => {
        if (!cancelled) setTrack(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void AncialAPI.pulseGetPlaylist<PulseTrack[]>({ gid: `Track_${trackId}` })
      .then((result) => {
        if (cancelled) return;
        setSimilarTracks(result || []);
        cache.set(`similar_tracks_${trackId}`, result || [], { category: 'pulse' });
      })
      .catch(() => {
        if (!cancelled) setSimilarTracks([]);
      })
      .finally(() => {
        if (!cancelled) setIsSimilarLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/pulse/search?q=${encodeURIComponent(searchValue)}`);
  }, [router, searchValue]);

  const likeTrack = useCallback(async () => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoaddfavorites || 'Войдите, чтобы добавить трек в Избранное', 'info');
      return;
    }

    if (!trackNumericId) return;

    try {
      const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', trackNumericId);
      const result = response.message || '';

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        setIsLiked(true);
        showPulseNote(result === 'CREATED_ADDED' ? (lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!') : (lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!'), 'success');
        return;
      }

      if (result === 'REMOVED') {
        setIsLiked(false);
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch {
      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    }
  }, [isAuthenticated, lang, showPulseNote, trackNumericId]);

  const addToPlaylist = useCallback(() => {
    if (!isAuthenticated) {
      showPulseNote(lang?.logintoaddtoplaylists || 'Войдите, чтобы добавлять треки в плейлисты', 'info');
      return;
    }

    if (trackNumericId) {
      openAddToPlaylist(trackNumericId);
    }
  }, [isAuthenticated, openAddToPlaylist, showPulseNote, trackNumericId]);

  const copyTrackLink = useCallback(async (tid: number | string, t?: PulseTrack) => {
    const resolvedTrackId = toNumber(tid);
    if (!resolvedTrackId) return;

    setShareUrl(getPulseExternalUrl(`/pulse/track/${resolvedTrackId}`));

    if (t) {
      setShareAttachment({
        widgets: [{ type: 'music', track_id: resolvedTrackId.toString() }],
        preview: {
          authorName: decodeHtmlEntities(t.artist) || lang?.artist || 'Исполнитель',
          authorImg: getImageUrl(getTrackArtwork(t), '/img/noimg.png'),
          contentSnippet: decodeHtmlEntities(t.title) || lang?.untitled || 'Без названия',
        }
      });
    } else {
      setShareAttachment(null);
    }

    setIsShareModalOpen(true);
  }, [lang]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 pb-0 duration-300 lg:pb-64">
      <PulseHeader
        className="hidden md:flex"
        isAuthenticated={isAuthenticated}
        lang={lang}
        onLogoClick={() => router.push('/pulse')}
        onOpenMyPulse={() => router.push('/pulse/my')}
        onSubmitSearch={handleSearchSubmit}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        hideSearchOnMobile={true}
        hideProfileOnMobile={true}
      />
      <PulsePageHeader className="block md:hidden" onBack={() => router.push('/pulse')} />

      {loading ? (
        <div className="flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 lg:flex-row lg:justify-start">
          <div className="relative flex h-72 w-72 shrink-0 rounded-3xl shadow lg:h-96 lg:w-96">
            <div className="h-full w-full animate-pulse rounded-2xl bg-zinc-800 blur-xl" />
            <div className="absolute inset-x-0 h-full w-full animate-pulse rounded-2xl bg-zinc-800" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-14 w-64 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="grid w-fit grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !available ? (
        <PulseEmptyState description={lang?.nopostsdesc || 'Трек недоступен или удалён'} title={lang?.emptytopic || 'Пусто'} />
      ) : null}

      {!loading && available ? (
        <>
          <div className="flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 px-3 lg:flex-row lg:justify-start lg:px-0">
            <div className="relative flex h-72 w-72 shrink-0 rounded-3xl shadow lg:h-96 lg:w-96">
              <PulseCoverImage
                alt=""
                className="rounded-2xl blur-xl"
                sizes={PULSE_COVER_IMAGE_SIZES.hero}
                src={image}
              />
              <PulseCoverImage
                alt={title}
                className="rounded-2xl"
                sizes={PULSE_COVER_IMAGE_SIZES.hero}
                src={image}
              />
            </div>

            <div className="flex flex-col items-center gap-3 lg:items-start">
              <div className="flex flex-col gap-1.5 text-center lg:text-left">
                <h1 className="flex max-w-[92vw] flex-col break-words text-2xl font-black leading-none md:text-4xl lg:max-w-4xl lg:text-7xl">
                  {title}
                  <span className="text-sm font-thin text-content-600 lg:text-lg">{artist}</span>
                </h1>
                <span className="flex w-full items-center justify-center gap-1 text-zinc-300 lg:justify-start">
                  <ActionIcon className="h-8 w-8 fill-zinc-300" name="IC-speaker" />
                  <span>{toNumber(track?.listens)}</span>
                </span>
              </div>

              <div className="grid w-fit grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center">
                  <Dropdown
                    align="start"
                    menuClassName="min-w-[13rem]"
                    position="bottom"
                    triggerClassName="h-16 w-16 rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow hover:bg-zinc-700"
                    triggerIcon="IC-more"
                    triggerNode={<ActionIcon className="h-10 w-10" name="IC-more" />}
                    triggerSize="sm"
                  >
                    {isAuthenticated ? (
                      <DropdownItem icon="IC-plus" onClick={addToPlaylist}>
                        {lang?.add_to_playlist || 'В плейлист'}
                      </DropdownItem>
                    ) : null}
                    {track?.src ? (
                      <DropdownItem icon="IC-download" onClick={() => window.open(`${normalizeText(track.src)}?download=1`, '_blank', 'noopener,noreferrer')}>
                        {lang?.download || 'Скачать'}
                      </DropdownItem>
                    ) : null}
                  </Dropdown>
                  <span className="text-sm text-content-500">{lang?.save || 'Сохранить'}</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (active) {
                        togglePlay();
                        return;
                      }

                      if (trackNumericId) void playTrack(trackNumericId);
                    }}
                    className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95"
                  >
                    <ActionIcon className="h-10 w-10" name={active ? 'IC-pause' : 'IC-play'} />
                  </button>
                  <span className="text-sm text-content-500">{lang?.listen || 'Слушать'}</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <button
                    type="button"
                    disabled={!isAuthenticated}
                    onClick={() => void likeTrack()}
                    className={cn(
                      'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 shadow duration-300',
                      isAuthenticated ? 'cursor-pointer hover:bg-zinc-700 active:scale-95' : 'cursor-not-allowed opacity-30',
                    )}
                  >
                    <ActionIcon className="h-10 w-10" name={isLiked ? 'IC-heart-filled' : 'IC-heart'} />
                  </button>
                  <span className="text-sm text-content-500">{lang?.favorites || 'Избранное'}</span>
                </div>
              </div>
            </div>
          </div>

          {isSimilarLoading || (similarTracks && similarTracks.length > 0) ? (
            <div className="w-full max-w-screen-2xl mt-6">
              <TrackCollectionPanel
                collectionId={`Track_${trackId}`}
                currentCollectionId={currentSongId ? `Track_${trackId}` : ''}
                isAuthenticated={isAuthenticated}
                isLoading={isSimilarLoading}
                isPlaying={isPlaying && Boolean(currentSongId)}
                onOpenCollection={() => { }}
                onPlayCollection={() => { }}
                buttonVisible={false}
                title={lang?.similar || 'Похожее'}
                tracks={similarTracks}
                onRenderTrack={(t, index) => (
                  <PulseTrackRow
                    currentSongId={currentSongId}
                    favoriteIds={favoriteIds}
                    isAuthenticated={isAuthenticated}
                    onAddToPlaylist={(id) => openAddToPlaylist(toNumber(id))}
                    onCopyTrackLink={copyTrackLink}
                    onLikeTrack={async () => { }}
                    onOpenArtist={(id) => router.push(`/pulse/artist/${id}`)}
                    onPlayTrack={(clickedTrack) => {
                      if (clickedTrack.sid) void playTrack(toNumber(clickedTrack.sid));
                    }}
                    onQueueTrackNext={async () => { }}
                    track={t}
                    trackIndex={index}
                    user={user}
                    userCountry={userCountry}
                  />
                )}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <ShareModal
        copyLabel={lang?.copylink || 'Скопировать ссылку'}
        title={lang?.share || 'Поделиться'}
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success', 3)}
        onCopyFailed={() => showPulseNote(shareUrl, 'info', 5)}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
        attachmentWidgets={shareAttachment?.widgets}
        attachmentPreview={shareAttachment?.preview}
      />

      <PulseLegalFooter className="mt-3" />
    </div>
  );
}
