'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ShareModal from '../../../components/share-modal';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI } from '../../../lib/api-v2';
import { SITE_CONFIG } from '../../../seo';
import PulseUploadTrackModal, { PulseDeleteTrackModal } from '../../pulse-upload-track-modal';
import { readPulseJsonCache, writePulseJsonCache } from '../../pulse-cache';
import {
  ActionIcon,
  getPulseBackgroundColorByMood,
  PulseEmptyState,
  PulseLogo,
  PulseReportModal,
  PulseTrackRow,
  TracksPanelSkeleton,
  decodeHtmlEntities,
  getImageUrl,
  getTrackArtwork,
  normalizeText,
  toNumber,
  type PulseTrack,
} from '../../pulse-components';

const FAVORITES_CACHE_KEY = 'pulse_fav_ids';

type PulseTracksSearchResponse = {
  tracks?: PulseTrack[] | null;
};

function getPulseTracksSearchCacheKey(query: string) {
  return `pulse_search_tracks:${encodeURIComponent(query || '__empty__')}`;
}

function getExternalPulseUrl(path: string) {
  return `${SITE_CONFIG.url}${path}`;
}

export default function PulseSearchTracksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeText(searchParams.get('q'));
  const { isAuthenticated, lang, user } = useAuth();
  const { showNote } = useNotification();
  const {
    currentSongId,
    currentTrackObj,
    isPlaying: _isPlaying,
    openAddToPlaylist,
    playNextTrack,
    playTrack,
  } = usePulsePlayer();

  const [tracks, setTracks] = useState<PulseTrack[]>(() => {
    const cached = readPulseJsonCache<PulseTracksSearchResponse>(getPulseTracksSearchCacheKey(query));
    return Array.isArray(cached?.tracks) ? cached.tracks : [];
  });
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    (readPulseJsonCache<number[]>(FAVORITES_CACHE_KEY) ?? []).map((id) => toNumber(id)).filter(Boolean),
  );
  const [loading, setLoading] = useState(!tracks.length);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareAttachment, setShareAttachment] = useState<{
    widgets: any[];
    preview: { authorName: string; authorImg: string; contentSnippet: string; firstImage?: string };
  } | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<PulseTrack | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<PulseTrack | null>(null);
  const [reportTrackTarget, setReportTrackTarget] = useState<PulseTrack | null>(null);

  const userCountry = useMemo(() => {
    const nextCountry = normalizeText(
      typeof window !== 'undefined'
        ? String((window as Window & { userCountry?: string }).userCountry ?? user?.country ?? '')
        : String(user?.country ?? ''),
    );
    return nextCountry || 'RU';
  }, [user?.country]);

  const showPulseNote = useCallback(
    (content: string, type: 'error' | 'info' | 'success' = 'info', time = 4) => {
      showNote({ content, time, type });
    },
    [showNote],
  );

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getPulseTracksSearchCacheKey(query);
    const cached = readPulseJsonCache<PulseTracksSearchResponse>(cacheKey);

    if (cached && Array.isArray(cached.tracks)) {
      setTracks(cached.tracks);
      setLoading(false);
    } else {
      setTracks([]);
      setLoading(true);
    }

    const loadData = async () => {
      const [favResult, searchResult] = await Promise.allSettled([
        AncialAPI.pulseGetLibrary<{ ids?: Array<number | string> }>('favorites'),
        AncialAPI.pulseSearch<PulseTracksSearchResponse>(query, 'tracks'),
      ]);

      if (cancelled) return;

      if (favResult.status === 'fulfilled') {
        const nextIds = Array.isArray(favResult.value.ids)
          ? favResult.value.ids.map((id) => toNumber(id)).filter(Boolean)
          : [];
        writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
        setFavoriteIds(nextIds);
      }

      if (searchResult.status === 'fulfilled') {
        const nextTracks = Array.isArray(searchResult.value.tracks) ? searchResult.value.tracks : [];
        writePulseJsonCache(cacheKey, { tracks: nextTracks });
        setTracks(nextTracks);
      } else if (!cached?.tracks?.length) {
        setTracks([]);
      }

      setLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const likeTrack = useCallback(
    async (track: PulseTrack) => {
      if (!isAuthenticated) {
        showPulseNote(lang?.logintoaddfavorites || 'Войдите, чтобы добавлять треки в избранное', 'info');
        return;
      }

      const trackId = toNumber(track.sid);
      if (!trackId) return;

      try {
        const response = await AncialAPI.pulseTrackAction<{ message?: string }>('add_favorite', trackId);
        const result = response.message || '';

        if (result === 'ADDED' || result === 'CREATED_ADDED') {
          setFavoriteIds((ids) => {
            const nextIds = ids.includes(trackId) ? ids : [...ids, trackId];
            writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
            return nextIds;
          });
          showPulseNote(
            result === 'CREATED_ADDED'
              ? lang?.pulse_fav_playlist_created || 'Плейлист с избранными треками создан. Трек добавлен в ваш плейлист!'
              : lang?.pulse_track_added || 'Трек добавлен в ваш плейлист!',
            'success',
          );
          return;
        }

        if (result === 'REMOVED') {
          setFavoriteIds((ids) => {
            const nextIds = ids.filter((id) => id !== trackId);
            writePulseJsonCache(FAVORITES_CACHE_KEY, nextIds);
            return nextIds;
          });
          showPulseNote(lang?.pulse_track_removed || 'Трек удалён из вашего плейлиста!', 'success');
          return;
        }

        showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
      } catch {
        showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
      }
    },
    [isAuthenticated, lang, showPulseNote],
  );

  const copyTrackLink = useCallback(
    async (trackId: number | string, track?: PulseTrack) => {
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
          },
        });
      } else {
        setShareAttachment(null);
      }
      setIsShareModalOpen(true);
    },
    [lang],
  );

  const openAddTrackToPlaylist = useCallback(
    (trackId: number | string) => {
      if (!isAuthenticated) {
        showPulseNote(lang?.logintoaddtoplaylists || 'Войдите, чтобы добавлять треки в плейлисты', 'info');
        return;
      }
      openAddToPlaylist(trackId);
    },
    [isAuthenticated, openAddToPlaylist, showPulseNote],
  );

  const reportTrack = useCallback(
    (track: PulseTrack) => {
      if (!isAuthenticated) {
        showPulseNote(lang?.logintoreport || 'Войдите, чтобы отправить жалобу', 'info');
        return;
      }
      const trackId = toNumber(track.sid);
      if (!trackId) return;
      setReportTrackTarget(track);
      setIsReportModalOpen(true);
    },
    [isAuthenticated, showPulseNote],
  );

  const handleTrackReport = useCallback(
    async (reason: string) => {
      if (!reportTrackTarget) return;
      const trackId = toNumber(reportTrackTarget.sid);
      if (!trackId) return;
      setIsReportModalOpen(false);
      try {
        const result = await AncialAPI.reportAction<{ message?: string }>({
          comment: reason,
          id: trackId,
          type: 6,
        });
        setReportTrackTarget(null);
        showPulseNote(result?.message || lang?.reportsended || 'Жалоба отправлена', 'success');
      } catch {
        showPulseNote(lang?.pulse_error_happened || 'Произошла ошибка =(', 'error');
      }
    },
    [lang, reportTrackTarget, showPulseNote],
  );

  const refreshAfterMutation = useCallback(() => {
    writePulseJsonCache(getPulseTracksSearchCacheKey(query), { tracks });
    setLoading(false);
  }, [query, tracks]);

  const goBack = useCallback(() => {
    router.push(`/pulse/search?q=${encodeURIComponent(query)}`);
  }, [router, query]);

  return (
    <div
      className={`relative isolate flex flex-col items-center justify-center gap-3 pb-64 transition-colors duration-1000 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-transparent before:via-black before:to-black lg:before:from-black ${getPulseBackgroundColorByMood(currentTrackObj?.mood)}`}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 flex w-full items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3">
        <div className="flex w-full max-w-screen-2xl items-center gap-3 px-3 lg:px-0">
          <button
            type="button"
            onClick={goBack}
            className="flex w-fit cursor-pointer items-center gap-3 duration-300 hover:opacity-80 active:scale-95"
          >
            <ActionIcon className="h-8 w-8" name="IC-chevron-left" />
            <PulseLogo className="w-32 md:w-48" />
          </button>
          <div className="flex-grow" />
          {query ? (
            <span className="truncate text-sm text-zinc-400 max-w-xs">
              «{query}»
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative flex w-full max-w-screen-2xl flex-col gap-3" style={{ zIndex: 19 }}>
        {/* Section title */}
        <span className="cutetext px-3 text-2xl font-black lg:px-0 lg:text-3xl xl:text-4xl">
          {lang?.tracks || 'Треки'}
        </span>

        {/* Skeleton */}
        {loading && !tracks.length ? (
          <div className="px-3 lg:px-0">
            <TracksPanelSkeleton rows={8} />
          </div>
        ) : null}

        {/* Tracks list */}
        {tracks.length ? (
          <div className="flex h-full w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
            {tracks.map((track, index) => (
              <PulseTrackRow
                currentSongId={currentSongId}
                favoriteIds={favoriteIds}
                isAuthenticated={isAuthenticated}
                key={`search-all-track-${track.sid ?? index}`}
                onAddToPlaylist={openAddTrackToPlaylist}
                onCopyTrackLink={copyTrackLink}
                onDeleteTrack={(t) => setTrackToDelete(t)}
                onEditTrack={(t) => setTrackToEdit(t)}
                onLikeTrack={likeTrack}
                onOpenArtist={(artistId) => router.push(`/pulse/artist/${encodeURIComponent(artistId)}`)}
                onPlayTrack={(nextTrack) => {
                  void playTrack(nextTrack.sid ?? 0);
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

        {/* Empty state */}
        {!loading && !tracks.length ? (
          <PulseEmptyState
            description={lang?.nopostsdesc || 'Попробуйте другой запрос'}
            title={lang?.noposts || 'Ничего не найдено'}
          />
        ) : null}
      </div>

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
      <PulseReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTrackTarget(null);
        }}
        onSelectReason={handleTrackReport}
        title={lang?.report || 'Пожаловаться'}
      />
      <PulseUploadTrackModal
        isOpen={Boolean(trackToEdit)}
        onClose={() => setTrackToEdit(null)}
        onUploaded={refreshAfterMutation}
        showNote={showPulseNote}
        track={trackToEdit}
      />
      <PulseDeleteTrackModal
        isOpen={Boolean(trackToDelete)}
        onClose={() => setTrackToDelete(null)}
        onDeleted={refreshAfterMutation}
        showNote={showPulseNote}
        track={trackToDelete}
      />
    </div>
  );
}
