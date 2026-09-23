'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sanitizeUserHtml } from '../../../lib/sanitize-html';

import ReportModal from '../../../components/report-modal';
import ShareModal from '../../../components/share-modal';
import { useAuth, type User } from '../../../context/AuthContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { usePulseNote } from '../../../hooks/use-pulse-note';
import { usePulseTrackReport } from '../../../hooks/use-pulse-track-report';
import { useRequireAuth } from '../../../hooks/use-require-auth';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { buildPulseTrackReportReasons } from '../../../lib/report-reasons';
import { useUserCountry } from '../../../lib/user-geo';
import { SITE_CONFIG } from '../../../seo';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from '../../pulse-upload-track-modal';
import { getPulsePlaylistTracksCacheKey } from '../../playlist/playlist-model';
import { readPulseJsonCache, removePulseCache, writePulseJsonCache } from '../../pulse-cache';
import { usePulseFavoriteIds } from '../../player/use-pulse-favorite-ids';
import {
  DEFAULT_TRACK_IMAGE,
  getPulseBackgroundColorByMood,
  getTrackArtwork,
  PulseEmptyState,
  PulseLegalFooter,
  PulsePageHeader,
  PulsePlaylistTile,
  PulsePlaylistTileSkeleton,
  PulseScrollSection,
  PulseSectionTitle,
  PulseTrackRow,
  TracksPanelSkeleton,
  cn,
  decodeHtmlEntities,
  getImageUrl,
  normalizeText,
  toNumber,
  type PulsePlaylistCardData,
  type PulseShareAttachment,
  type PulseTrack,
} from '../../pulse-components';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';

type PulseArtistOwner = Pick<User, 'fname' | 'img' | 'lname' | 'username'>;

type PulseArtist = {
  desk?: string | null;
  id?: number | string | null;
  img?: string | null;
  listens?: number | string | null;
  name?: string | null;
  owner?: PulseArtistOwner | null;
  verify?: number | string | null;
};

type PulseArtistResponse = {
  artist?: PulseArtist | null;
};

type PulseArtistPlaylistsResponse = {
  playlists?: PulsePlaylistCardData[] | null;
};

type PulseArtistTracksResponse = {
  popular_tracks?: PulseTrack[] | null;
};

function isGenlistPlaylist(card: PulsePlaylistCardData) {
  return String(card.type ?? '') === '4';
}

function getCardPlayableId(card: PulsePlaylistCardData) {
  return isGenlistPlaylist(card)
    ? normalizeText(card.genlist)
    : normalizeText(String(card.id ?? ''));
}

function getExternalPulseUrl(path: string) {
  return `${SITE_CONFIG.url}${path}`;
}

export default function PulseArtistContent({ artistId }: { artistId: string }) {
  const router = useRouter();
  const { isAuthenticated, lang, user } = useAuth();
  const {
    currentCollectionId,
    currentSongId,
    currentTrackObj,
    isPlaying,
    openAddToPlaylist,
    playArtistPlaylist,
    playGenlist,
    playNextTrack,
    playPlaylist,
    togglePlay,
  } = usePulsePlayer();

  const cacheId = normalizeText(artistId) || '0';
  const artistTracksCacheKey = getPulsePlaylistTracksCacheKey(cacheId, { genlist: '', type: '5' }, cacheId);
  const cachedTracks = readPulseJsonCache<PulseTrack[]>(artistTracksCacheKey) ?? [];
  const [artist, setArtist] = useState<PulseArtist | null>(() => readPulseJsonCache<PulseArtistResponse>(`artist_${cacheId}`)?.artist ?? null);
  const playlistsScrollRef = useDragScroll({ speed: 2 });
  const { favoriteIds, replaceFavoriteIds, updateFavoriteIds } = usePulseFavoriteIds();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<PulseShareAttachment | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [tracksReloadToken, setTracksReloadToken] = useState(0);
  const [loadingArtist, setLoadingArtist] = useState(!artist);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(!cachedTracks.length);
  const [playlists, setPlaylists] = useState<PulsePlaylistCardData[]>(() => readPulseJsonCache<PulseArtistPlaylistsResponse>(`artist_playlists_${cacheId}`)?.playlists ?? []);
  const [tracks, setTracks] = useState<PulseTrack[]>(cachedTracks);

  const userCountry = useUserCountry();

  const artistName = decodeHtmlEntities(artist?.name) || (lang?.artist || 'Артист');
  const artistDescription = decodeHtmlEntities(artist?.desk);
  const artistImage = getImageUrl(artist?.img, DEFAULT_TRACK_IMAGE);
  const listensTotal = useMemo(() => tracks.reduce((sum, track) => sum + toNumber(track.listens), 0), [tracks]);
  const verifyStatus = String(artist?.verify ?? '');
  const owner = artist?.owner ?? null;

  const showPulseNote = usePulseNote();
  const requireAuth = useRequireAuth(showPulseNote);

  useEffect(() => {
    let cancelled = false;

    void AncialAPI.pulseGetArtist<PulseArtistResponse & PulseArtistPlaylistsResponse & PulseArtistTracksResponse>(cacheId)
      .then((result) => {
        if (cancelled) return;

        if (result.artist) {
          writePulseJsonCache(`artist_${cacheId}`, { artist: result.artist });
          setArtist(result.artist);
        } else {
          setArtist(null);
        }
        
        const nextPlaylists = Array.isArray(result.playlists) ? result.playlists : [];
        if (nextPlaylists.length) {
          writePulseJsonCache(`artist_playlists_${cacheId}`, { playlists: nextPlaylists });
        }
        setPlaylists(nextPlaylists);

        const nextTracks = Array.isArray(result.popular_tracks) ? result.popular_tracks : [];
        if (nextTracks.length) {
          writePulseJsonCache(artistTracksCacheKey, nextTracks);
        }
        setTracks(nextTracks);
        setLoadingTracks(false);
      })
      .catch(() => {
        // При ошибке сети (офлайн) оставляем кэшированные данные артиста, плейлистов и треков
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArtist(false);
          setLoadingPlaylists(false);
        }
      });

    void AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites')
      .then((favoritesResult) => {
        if (cancelled) return;

        const nextIds = Array.isArray(favoritesResult.ids)
          ? favoritesResult.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];
        replaceFavoriteIds(nextIds);
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, [artistTracksCacheKey, cacheId, tracksReloadToken, replaceFavoriteIds]);

  const playPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const playableId = getCardPlayableId(card);
    if (!playableId) return;

    if (isGenlistPlaylist(card)) {
      void playGenlist(playableId);
      return;
    }

    void playPlaylist(playableId);
  }, [playGenlist, playPlaylist]);

  const openPlaylistCard = useCallback((card: PulsePlaylistCardData) => {
    const id = normalizeText(String(card.id ?? '0')) || '0';
    router.push(`/pulse/playlist/${encodeURIComponent(id)}`);
  }, [router]);

  const likeTrack = useCallback(async (track: PulseTrack) => {
    if (!requireAuth(lang?.logintoaddfavorites || 'Войдите, чтобы добавлять треки в избранное')) return;

    const trackId = toNumber(track.sid);
    if (!trackId) return;

    try {
      const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', trackId);
      const result = response.message || '';

      if (result === 'ADDED' || result === 'CREATED_ADDED') {
        updateFavoriteIds((ids) => ids.includes(trackId) ? ids : [...ids, trackId]);
        showPulseNote(result === 'CREATED_ADDED' ? (lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!') : (lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!'), 'success');
        return;
      }

      if (result === 'REMOVED') {
        updateFavoriteIds((ids) => ids.filter((id) => id !== trackId));
        showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
        return;
      }

      showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
    } catch (err) {
      showPulseNote(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pulse_error_happened || 'Произошла ошибка =('), 'error');
    }
  }, [lang, requireAuth, showPulseNote, updateFavoriteIds]);

  const copyTrackLink = useCallback(async (trackId: number | string, track?: PulseTrack) => {
    const resolvedTrackId = toNumber(trackId);
    if (!resolvedTrackId) return;

    setShareUrl(getExternalPulseUrl(`/pulse/track/${resolvedTrackId}`));
    if (track) {
      setShareAttachment({
        widgets: [{ type: 'music', track_id: resolvedTrackId.toString() }],
        preview: {
          authorName: decodeHtmlEntities(track.artist) || lang?.artist || 'Исполнитель',
          authorImg: getImageUrl(getTrackArtwork(track), '/img/noimg.png'),
          contentSnippet: decodeHtmlEntities(track.title) || lang?.untitled || 'Без названия',
        }
      });
    } else {
      setShareAttachment(null);
    }
    setIsShareModalOpen(true);
  }, [lang]);

  const openAddTrackToPlaylist = useCallback((trackId: number | string) => {
    if (!requireAuth(lang?.logintoaddtoplaylists || 'Войдите, чтобы добавлять треки в плейлисты')) return;

    openAddToPlaylist(trackId);
  }, [lang?.logintoaddtoplaylists, openAddToPlaylist, requireAuth]);

  const {
    closeReportModal,
    handleTrackReport,
    isReportModalOpen,
    reportTrack,
  } = usePulseTrackReport<PulseTrack>(showPulseNote);

  const refreshTracksAfterMutation = useCallback(() => {
    removePulseCache(artistTracksCacheKey);
    setTracksReloadToken((token) => token + 1);
  }, [artistTracksCacheKey]);

  const openEditTrack = useCallback((track: PulseTrack) => {
    setTrackToEdit(track);
  }, []);

  const closeEditTrack = useCallback(() => {
    setTrackToEdit(null);
  }, []);

  const openDeleteTrack = useCallback((track: PulseTrack) => {
    setTrackToDelete(track);
  }, []);

  const missing = !loadingArtist && !artist;
  const artistCollectionActive = currentCollectionId === `artist_${cacheId}` && isPlaying;

  return (
    <div className={cn("relative isolate flex flex-col items-center justify-center gap-3 pb-40 transition-colors duration-1000 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-transparent before:via-black before:to-black lg:pb-64 lg:before:from-black", getPulseBackgroundColorByMood(currentTrackObj?.mood))}>
      <PulsePageHeader onBack={() => router.push('/pulse')} />

      {!missing ? (
        <div className="flex w-full max-w-screen-2xl flex-col items-center justify-center gap-6 px-3 lg:flex-row lg:justify-start lg:px-0">
          <div className="relative flex h-64 w-64 shrink-0 rounded-full border border-zinc-600/30 shadow lg:h-72 lg:w-72">
            {loadingArtist ? (
              <>
                <div className="h-full w-full animate-pulse rounded-full bg-zinc-800 blur-xl" />
                <div className="absolute inset-x-0 h-full w-full animate-pulse rounded-full bg-zinc-800" />
              </>
            ) : (
              <>
                <AppImage width={288} height={288} skeleton={false} className="h-full w-full rounded-full object-cover blur-xl" src={artistImage} alt="" />
                <AppImage width={288} height={288} className="absolute inset-x-0 z-[9] h-full w-full rounded-full object-cover" src={artistImage} alt={artistName} />
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <div className="flex flex-col items-center gap-1.5 text-center lg:items-start lg:text-left">
              {loadingArtist ? (
                <>
                  <div className="h-14 w-64 animate-pulse rounded-2xl bg-zinc-800" />
                  <div className="h-6 w-48 animate-pulse rounded-2xl bg-zinc-800" />
                </>
              ) : (
                <>
                  <h1 className="flex max-w-[92vw] items-center gap-1.5 break-words text-2xl font-black leading-none md:text-4xl lg:max-w-4xl lg:text-7xl">
                    {artistName}
                    {verifyStatus === '0' || verifyStatus === '1' ? (
                      <Icon name="IC-verify" className={cn('inline', cn('h-5 w-5 md:h-8 md:w-8 lg:h-12 lg:w-12', verifyStatus === '1' ? 'fill-blue-500' : 'fill-amber-500'))} />
                    ) : null}
                  </h1>
                  {artistDescription ? (
                    <span
                      className="text-base text-zinc-200 md:text-lg lg:text-xl"
                      dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(artistDescription.replace(/\n/g, '<br>'), { preloadImages: true }) }}
                    />
                  ) : null}
                  <span className="flex w-full items-center justify-center gap-1 text-zinc-300 lg:justify-start">
                    <Icon name="IC-speaker" className="inline h-8 w-8 fill-zinc-300" />
                    <span>{loadingTracks ? <Icon name="IC-loader" className="inline h-6 w-6 animate-spin fill-purple-500" /> : listensTotal}</span>
                    <span className="text-xs text-zinc-400 duration-300 hover:text-lg">{lang?.pulse_all_time || 'за всё время'}</span>
                  </span>
                  {verifyStatus === '0' ? (
                    <span className="w-fit rounded-box bg-content-100 px-2 py-1 text-xs text-zinc-300 opacity-95 shadow duration-300">
                      <Icon name="IC-verify" className="inline inline h-5 w-5 fill-amber-500" /> - {lang?.pulse_unverified_note || 'данные настоящие, но оригинальный владелец не имеет доступа к публикуемым трекам.'}
                    </span>
                  ) : null}
                  {verifyStatus === '1' && owner ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/@${encodeURIComponent(normalizeText(owner.username) || 'id' + normalizeText(String(artist?.id ?? '')))}`)}
                      className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 p-0.5 text-zinc-300 opacity-95 shadow duration-300 hover:bg-zinc-700/80 active:scale-95"
                    >
                      <AppImage width={40} height={40} src={getImageUrl(owner.img, DEFAULT_TRACK_IMAGE)} fallbackSrc={DEFAULT_TRACK_IMAGE} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      <span className="text-left text-sm text-zinc-200 lg:text-base">
                        {decodeHtmlEntities(`${owner.fname ?? ''} ${owner.lname ?? ''}`) || (lang?.user || 'Пользователь')} {lang?.manages_page || 'управляет данной страницей'}
                      </span>
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {!loadingArtist && tracks.length ? (
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (artistCollectionActive) {
                      togglePlay();
                    } else {
                      void playArtistPlaylist(cacheId);
                    }
                  }}
                  className={cn('flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-purple-500 shadow duration-300 hover:bg-purple-600 active:scale-95')}
                  aria-label={artistCollectionActive ? 'Pause artist' : 'Play artist'}
                >
                  <Icon name={artistCollectionActive ? 'IC-pause' : 'IC-play'} className="inline fill-current h-10 w-10" />
                </button>
                <button
                  type="button"
                  onClick={() => void playArtistPlaylist(cacheId, true, 1)}
                  className="absolute bottom-0 -right-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-lime-500 shadow duration-300 hover:bg-lime-600 active:scale-95"
                  aria-label="Shuffle artist"
                >
                  <Icon name="IC-shuffle" className="inline h-5 w-5 fill-white" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <PulseEmptyState description={lang?.nopostsdesc || 'Артист не найден'} title={lang?.emptytopic || 'Пусто'} />
      )}

      {!missing && (loadingPlaylists || playlists.length > 0) ? (
        <>
          <PulseSectionTitle>{lang?.playlists || 'Плейлисты'}</PulseSectionTitle>
          <PulseScrollSection scrollRef={playlistsScrollRef}>
            {loadingPlaylists && !playlists.length ? Array.from({ length: 6 }).map((_, index) => <PulsePlaylistTileSkeleton key={index} />) : null}
            {playlists.map((card) => {
              const playableId = getCardPlayableId(card);
              return (
                <PulsePlaylistTile
                  card={card}
                  isPlaying={Boolean(playableId && currentCollectionId === playableId && isPlaying)}
                  key={`artist-playlist-${card.id ?? card.genlist ?? card.name}`}
                  onOpen={() => openPlaylistCard(card)}
                  onPlay={() => playPlaylistCard(card)}
                />
              );
            })}
          </PulseScrollSection>
        </>
      ) : null}

      {!missing ? (
        <>
          <PulseSectionTitle>{lang?.tracks || 'Треки'}</PulseSectionTitle>
          <div className="w-full max-w-screen-2xl rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            {loadingTracks ? <TracksPanelSkeleton rows={6} /> : null}
            {!loadingTracks && tracks.length ? (
              <div className="flex flex-col gap-3">
                {tracks.map((track, index) => (
                  <PulseTrackRow
                    currentSongId={currentSongId}
                    favoriteIds={favoriteIds}
                    isAuthenticated={isAuthenticated}
                    key={`artist-track-${track.sid ?? index}`}
                    onAddToPlaylist={openAddTrackToPlaylist}
                    onCopyTrackLink={copyTrackLink}
                    onDeleteTrack={openDeleteTrack}
                    onEditTrack={openEditTrack}
                    onLikeTrack={likeTrack}
                    onOpenArtist={(nextArtistId) => router.push(`/pulse/artist/${encodeURIComponent(nextArtistId)}`)}
                    onPlayTrack={(nextTrack, nextIndex) => {
                      void playArtistPlaylist(cacheId, true, 0, nextIndex, nextTrack.sid);
                    }}
                    onQueueTrackNext={(trackId) => playNextTrack(trackId)}
                    onReportTrack={reportTrack}
                    track={track}
                    trackIndex={index}
                    user={user}
                    userCountry={userCountry}
                  />
                ))}
              </div>
            ) : null}
            {!loadingTracks && !tracks.length ? (
              <PulseEmptyState description={lang?.hope_not_long || 'Надеемся, что это не на долго'} title={lang?.empty_here || 'Здесь пока пусто'} />
            ) : null}
          </div>
        </>
      ) : null}

      <PulseLegalFooter className="mt-3" />

      <ShareModal
        copyLabel={lang?.copylink || 'Скопировать ссылку'}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onCopied={() => showPulseNote(lang?.linkcopied || 'Ссылка скопирована', 'success', 3)}
        onCopyFailed={() => showPulseNote(shareUrl, 'info', 5)}
        shareUrl={shareUrl}
        title={lang?.share || 'Поделиться'}
        attachmentWidgets={shareAttachment?.widgets}
        attachmentPreview={shareAttachment?.preview}
      />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={closeReportModal}
        onReport={handleTrackReport}
        reasons={buildPulseTrackReportReasons(lang)}
        title={lang?.report || 'Пожаловаться'}
      />
      <PulseUploadTrackModal
        isOpen={Boolean(trackToEdit)}
        onClose={closeEditTrack}
        onUploaded={refreshTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToEdit}
      />
      <PulseDeleteTrackModal
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onDeleted={refreshTracksAfterMutation}
        showNote={showPulseNote}
        track={trackToDelete}
      />
    </div>
  );
}
