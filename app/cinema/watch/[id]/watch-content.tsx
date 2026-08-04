'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Movie, PlayerOption } from '../../types';
import { fetchCinemaVideoById, fetchVideoHubStreamDirect } from '../../cinema-api';
import { useTvNavigation } from '../../use-tv-navigation';
import { FrameBrandLoader } from '../../components/cinema-skeleton';
import CustomPlayer from '../../components/custom-player';
import { CacheManager } from '../../../lib/cache';
import { getCinemaCache } from '../../cinema-cache';
import { getMovieProgress, saveWatchHistoryItem } from '../../cinema-history';

interface WatchContentProps {
  id: string;
}

export default function WatchContent({ id }: WatchContentProps) {
  useTvNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const savedProgress = getMovieProgress(id);
  const season = searchParams.get('season') || (savedProgress?.season ? String(savedProgress.season) : null);
  const episode = searchParams.get('episode') || (savedProgress?.episode ? String(savedProgress.episode) : null);
  const translation = searchParams.get('translation') || (savedProgress?.translationId ? String(savedProgress.translationId) : null);
  const player = searchParams.get('player') || savedProgress?.playerId || 'flixcdn';

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [currentSeason, setCurrentSeason] = useState<number>(season ? Number(season) : 1);
  const [videoHubStreamUrl, setVideoHubStreamUrl] = useState<string | undefined>(undefined);
  const [videoHubQualities, setVideoHubQualities] = useState<Array<{ label: string; url: string }>>([]);
  const [entryUrl, setEntryUrl] = useState<string | null>(null);

  // Capture real entry referrer (page user came from before entering /cinema/watch)
  useEffect(() => {
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin && !refUrl.pathname.includes('/cinema/watch')) {
          setEntryUrl(refUrl.pathname + refUrl.search);
        }
      } catch (e) {}
    }
  }, []);

  const handleGoBack = () => {
    const targetId = id || movie?.id;

    // 1. If entryUrl was explicitly an info page, use replace to erase watch from history stack
    if (entryUrl && entryUrl.includes('/cinema/info/')) {
      router.replace(entryUrl);
      return;
    }

    // 2. Primary behavior: replace current watch entry in history with the info page of this title
    if (targetId) {
      router.replace(`/cinema/info/${targetId}`);
      return;
    }

    // 3. Fallback
    if (entryUrl) {
      router.replace(entryUrl);
    } else {
      router.replace('/cinema');
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Instantly read cached movie metadata if available
    const cached = getCinemaCache<Movie>('info', id) || CacheManager.get<Movie>(`cinema_video_by_id_${id}`, { category: 'cinema', subcategory: 'video' });
    if (cached) {
      setMovie(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    async function loadWatchMovie() {
      const target = await fetchCinemaVideoById(id);
      if (isMounted && target) {
        setMovie(target);
        setIsLoading(false);

        // Update watch history & progress
        try {
          const activePlayerId = player;
          const activeTransId = translation ? Number(translation) : null;
          const transObj = target.translationsList?.find((t) => t.id === activeTransId);
          const playerObj = target.players?.find((p) => p.id === activePlayerId);

          saveWatchHistoryItem({
            id: target.id,
            title: target.title,
            originalTitle: target.originalTitle,
            description: target.description,
            posterUrl: target.posterUrl,
            backdropUrl: target.backdropUrl,
            rating: target.rating,
            year: target.year,
            ageRating: target.ageRating,
            duration: target.duration,
            type: target.type,
            isEpisodic:
              target.type !== 'movie' ||
              Boolean(target.counters?.episodes) ||
              Boolean(target.counters?.seasons) ||
              Boolean(target.episodesBySeason && Object.keys(target.episodesBySeason).length > 0),
            season: season ? Number(season) : 1,
            episode: episode ? Number(episode) : 1,
            translationId: activeTransId,
            translationTitle: transObj?.title || '',
            playerId: activePlayerId,
            playerName: playerObj?.name || '',
          });
        } catch (e) { }
      }
    }
    loadWatchMovie();

    return () => {
      isMounted = false;
    };
  }, [id, season, episode, translation, player, searchParams]);

  // Sync currentSeason when season searchParam changes
  useEffect(() => {
    if (season) setCurrentSeason(Number(season));
  }, [season]);

  // Handle TV Back / Escape key & autofocus when picker modal is open
  useEffect(() => {
    if (!showPicker) return;

    setTimeout(() => {
      const firstBtn = document.querySelector<HTMLElement>('[data-modal-picker="true"] button.focusable-tv, [data-modal-picker="true"] button');
      if (firstBtn) firstBtn.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.keyCode === 27 || e.keyCode === 4) {
        e.preventDefault();
        e.stopPropagation();
        setShowPicker(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showPicker]);

  // Hide mobile navigation bar on mount (matching /messages pattern)
  useEffect(() => {
    document.documentElement.classList.add('cinema-watch-open');
    document.body.classList.add('cinema-watch-open');
    return () => {
      document.documentElement.classList.remove('cinema-watch-open');
      document.body.classList.remove('cinema-watch-open');
    };
  }, []);

  // Fetch VideoHub stream directly on client before any early returns
  useEffect(() => {
    let isCancelled = false;
    const selectedPlayerId = player;
    const targetKpId = movie?.kinopoisk_id || movie?.id || id;
    const activeSeason = season ? Number(season) : 1;
    const activeEpisode = episode ? Number(episode) : 1;
    const activeTranslationId = translation ? Number(translation) : movie?.translationsList?.[0]?.id;
    const playerTranslations = movie?.players?.find((candidate) => candidate.id === selectedPlayerId)?.translations;
    const activeTranslationTitle =
      playerTranslations?.find((t) => t.id === activeTranslationId)?.title ||
      movie?.translationsList?.find((t) => t.id === activeTranslationId)?.title;

    if (selectedPlayerId === 'videohub' && targetKpId) {
      setVideoHubStreamUrl(undefined);
      setVideoHubQualities([]);
      fetchVideoHubStreamDirect(
        targetKpId,
        activeSeason,
        activeEpisode,
        activeTranslationTitle,
      ).then((res) => {
        if (!isCancelled && res?.url) {
          setVideoHubStreamUrl(res.url);
          setVideoHubQualities(res.qualities || []);
        } else if (!isCancelled) {
          setVideoHubStreamUrl(undefined);
          setVideoHubQualities([]);
          const fallbackParams = new URLSearchParams(searchParams.toString());
          fallbackParams.set('player', 'flixcdn');
          fallbackParams.delete('time');
          fallbackParams.delete('t');
          router.replace(`/cinema/watch/${id}?${fallbackParams.toString()}`);
        }
      });
    } else {
      setVideoHubStreamUrl(undefined);
      setVideoHubQualities([]);
    }
    return () => {
      isCancelled = true;
    };
  }, [movie, player, id, season, episode, translation, router, searchParams]);

  // Persist current watch selection (season, episode, translation, player) via cache manager
  useEffect(() => {
    if (!movie) return;
    const curSeason = season ? Number(season) : 1;
    const curEpisode = episode ? Number(episode) : 1;
    const curTranslation = translation ? Number(translation) : (movie.translationsList?.[0]?.id || null);
    const curPlayerId = player;
    const transObj = movie.translationsList?.find((t) => t.id === curTranslation);
    const playerObj = movie.players?.find((p) => p.id === curPlayerId);

    try {
      saveWatchHistoryItem({
        id: movie.id,
        title: movie.title,
        originalTitle: movie.originalTitle,
        description: movie.description,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        rating: movie.rating,
        year: movie.year,
        ageRating: movie.ageRating,
        duration: movie.duration,
        type: movie.type,
        isEpisodic:
          movie.type !== 'movie' ||
          Boolean(movie.counters?.episodes) ||
          Boolean(movie.counters?.seasons) ||
          Boolean(movie.episodesBySeason && Object.keys(movie.episodesBySeason).length > 0),
        season: curSeason,
        episode: curEpisode,
        translationId: curTranslation,
        translationTitle: transObj?.title || '',
        playerId: curPlayerId,
        playerName: playerObj?.name || '',
      });
    } catch (e) {}
  }, [movie, season, episode, translation, player]);

  // Auto-focus active episode/season when picker modal opens
  useEffect(() => {
    if (showPicker) {
      setTimeout(() => {
        const picker = document.querySelector<HTMLElement>('[data-modal-picker="true"]');
        if (!picker) return;
        const activeItem = picker.querySelector<HTMLElement>('.bg-indigo-600, .bg-white') || picker.querySelector<HTMLElement>('.focusable-tv');
        if (activeItem) activeItem.focus();
      }, 50);
    }
  }, [showPicker]);

  if (isLoading) {
    return (
      <div className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none font-sans">
        <style>{`#NAVP, [data-app-nav="mobile"], [data-app-nav="desktop"] { display: none !important; }`}</style>
        {/* TOP HEADER CONTROLS (ALWAYS VISIBLE & CLICKABLE DURING INITIAL LOAD) */}
        <div className="absolute top-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              aria-label="Назад"
              tabIndex={0}
              className="focusable-tv p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-xl"
            >
              <svg className="w-5 h-5 stroke-white fill-none stroke-[2.5]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg lg:text-xl font-black text-white line-clamp-1">Загрузка...</h1>
          </div>
        </div>

        {/* PRELOADER ISOLATED IN THE CENTER BEHIND TOP BAR */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <FrameBrandLoader />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Видео не найдено</h2>
        <button
          onClick={() => router.push('/cinema')}
          className="px-6 py-2 rounded-full bg-white text-black font-bold"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const availableSeasonsCount = movie.counters?.seasons || (movie.episodesBySeason ? Object.keys(movie.episodesBySeason).length : 0) || 1;
  const isSeriesOrAnime =
    movie.type === 'series' ||
    movie.type === 'animeserial' ||
    movie.type === 'showserial' ||
    availableSeasonsCount > 1 ||
    Boolean(movie.counters?.episodes && movie.counters.episodes > 1) ||
    Boolean(movie.counters?.seasons && movie.counters.seasons > 1) ||
    Boolean(movie.genres?.some((g) => g.toLowerCase().includes('сериал')));

  const activeSeason = season ? Number(season) : 1;
  const activeEpisode = episode ? Number(episode) : 1;
  const activeTranslation = translation ? Number(translation) : (movie.translationsList?.[0]?.id || null);

  const currentSeasonEpisodes = isSeriesOrAnime
    ? (movie.episodesBySeason && movie.episodesBySeason[currentSeason] && movie.episodesBySeason[currentSeason].length > 0)
      ? movie.episodesBySeason[currentSeason]
      : Array.from({ length: movie.counters?.episodes || 10 }, (_, i) => i + 1)
    : [];

  // Derive clean numeric Kinopoisk ID (strip non-digits if present in temporary string IDs)
  const rawDigits = String(movie.kinopoisk_id || movie.id || id).replace(/\D+/g, '');
  const targetKpId = rawDigits || String(movie.kinopoisk_id || movie.id || id);

  // Build CDNMovies iframe URL
  let cdnMoviesIframeSrc = `https://ugly-turkey.cdnmovies-stream.online/kinopoisk/${targetKpId}/iframe`;
  const cdnParams = new URLSearchParams();
  if (isSeriesOrAnime) {
    cdnParams.set('season', String(activeSeason));
    cdnParams.set('episode', String(activeEpisode));
  }
  if (activeTranslation) cdnParams.set('translation_id', String(activeTranslation));
  if (cdnParams.toString()) {
    cdnMoviesIframeSrc += `?${cdnParams.toString()}`;
  }

  let rawBaseUrl = movie.videoUrl;
  if (!rawBaseUrl || rawBaseUrl.includes('null') || rawBaseUrl.includes('undefined')) {
    rawBaseUrl = `https://tarantino.factorios.live/show/kinopoisk/${targetKpId}`;
  }
  const baseUrl = rawBaseUrl.split('?')[0];
  const iframeParams = new URLSearchParams();
  if (isSeriesOrAnime) {
    iframeParams.set('season', String(activeSeason));
    iframeParams.set('episode', String(activeEpisode));
  }
  if (activeTranslation) iframeParams.set('translation', String(activeTranslation));
  iframeParams.set('no_controls', '1');
  iframeParams.set('no_control', '1');
  iframeParams.set('no_control_translations', '1');
  iframeParams.set('no_control_seasons', '1');
  iframeParams.set('no_control_episodes', '1');
  iframeParams.set('no_sharing', '1');
  iframeParams.set('no_title', '1');
  iframeParams.set('no_header', '1');
  iframeParams.set('no_control_title', '1');
  iframeParams.set('no_back', '1');
  const flixIframeSrc = `${baseUrl}?${iframeParams.toString()}`;

  // Build Collaps iframe URL
  let collapsIframeSrc = `https://api.ortified.ws/embed/kp/${targetKpId}`;
  const collapsParams = new URLSearchParams();
  if (isSeriesOrAnime) {
    collapsParams.set('season', String(activeSeason));
    collapsParams.set('episode', String(activeEpisode));
  }
  if (collapsParams.toString()) {
    collapsIframeSrc += `?${collapsParams.toString()}`;
  }

  const defaultPlayers: PlayerOption[] = [
    { id: 'flixcdn', name: 'Плеер 1 (FlixCDN)', provider: 'FlixCDN', iframeUrl: flixIframeSrc, isAvailable: true },
    { id: 'videohub', name: 'Плеер 2 (VideoHub)', provider: 'VideoHub', iframeUrl: '', isAvailable: true },
    { id: 'cdnmovies', name: 'Плеер 3 (CDNMovies)', provider: 'CDNMovies', iframeUrl: cdnMoviesIframeSrc, isAvailable: true },
    { id: 'collaps', name: 'Плеер 4 (Collaps)', provider: 'Collaps', iframeUrl: collapsIframeSrc, isAvailable: true },
  ];
  const configuredPlayers = movie.players?.length ? movie.players : defaultPlayers;
  const requiredPlayers = defaultPlayers.filter(
    (fallbackPlayer) =>
      (fallbackPlayer.id === 'flixcdn' || fallbackPlayer.id === 'videohub') &&
      !configuredPlayers.some((candidate) => candidate.id === fallbackPlayer.id),
  );
  const availablePlayers = [...configuredPlayers, ...requiredPlayers].filter(
    (candidate) => candidate.isAvailable !== false,
  );

  const hasMultipleSeasons = availableSeasonsCount > 1;
  const hasMultipleEpisodes = currentSeasonEpisodes.length > 1;
  const hasEpisodeSelection = isSeriesOrAnime && (hasMultipleSeasons || hasMultipleEpisodes);
  const hasMultipleTranslations = Boolean(movie.translationsList && movie.translationsList.length > 1);
  const hasMultiplePlayers = Boolean(availablePlayers && availablePlayers.length > 1);
  const showModalPicker = hasEpisodeSelection || hasMultipleTranslations || hasMultiplePlayers;

  const handleSelectEpisode = (sNum: number, epNum: number, transId?: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', String(sNum));
    params.set('episode', String(epNum));
    params.delete('time');
    params.delete('t');
    if (transId) params.set('translation', String(transId));
    router.replace(`/cinema/watch/${movie.id}?${params.toString()}`);
    setShowPicker(false);
  };

  const handleSelectTranslation = (transId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('translation', String(transId));
    params.delete('time');
    params.delete('t');
    router.replace(`/cinema/watch/${movie.id}?${params.toString()}`);
  };

  const getEpisodesForSeason = (seasonNumber: number) =>
    movie.episodesBySeason?.[seasonNumber]?.length
      ? movie.episodesBySeason[seasonNumber]
      : Array.from({ length: movie.counters?.episodes || 10 }, (_, i) => i + 1);
  const activeSeasonEpisodes = isSeriesOrAnime ? getEpisodesForSeason(activeSeason) : [];
  const activeEpisodeIndex = activeSeasonEpisodes.indexOf(activeEpisode);

  const handleNextEpisode = () => {
    const nextEpisode = activeSeasonEpisodes[activeEpisodeIndex + 1];
    if (nextEpisode !== undefined) {
      handleSelectEpisode(activeSeason, nextEpisode, activeTranslation);
    } else if (activeSeason < availableSeasonsCount) {
      const nextSeasonEpisodes = getEpisodesForSeason(activeSeason + 1);
      handleSelectEpisode(activeSeason + 1, nextSeasonEpisodes[0] || 1, activeTranslation);
    }
  };

  const handlePrevEpisode = () => {
    const previousEpisode = activeSeasonEpisodes[activeEpisodeIndex - 1];
    if (previousEpisode !== undefined) {
      handleSelectEpisode(activeSeason, previousEpisode, activeTranslation);
    } else if (activeSeason > 1) {
      const previousSeasonEpisodes = getEpisodesForSeason(activeSeason - 1);
      handleSelectEpisode(activeSeason - 1, previousSeasonEpisodes.at(-1) || 1, activeTranslation);
    }
  };

  // Find direct stream url if available in files
  const matchedFile = (movie.files || []).find((f: any) => {
    const sMatch = !f.season_number || Number(f.season_number) === activeSeason;
    const eMatch = !f.series_number || Number(f.series_number) === activeEpisode;
    const tMatch = !f.translation?.id || Number(f.translation.id) === activeTranslation;
    return sMatch && eMatch && tMatch;
  }) || (!isSeriesOrAnime ? (movie.files || [])[0] : undefined);

  // Only use directStreamUrl if matchedFile has an actual media stream URL (mp4, m3u8, webm, etc.)
  const candidateUrl = matchedFile?.url;
  const isDirectMediaFile = candidateUrl && (
    candidateUrl.includes('.mp4') ||
    candidateUrl.includes('.m3u8') ||
    candidateUrl.includes('.mkv') ||
    candidateUrl.includes('.webm') ||
    candidateUrl.includes('/file/') ||
    candidateUrl.includes('/stream/')
  );

  const selectedPlayerId = availablePlayers.some((candidate) => candidate.id === player)
    ? player
    : (availablePlayers[0]?.id || 'flixcdn');
  const activePlayerObj = (availablePlayers || []).find((p) => p.id === selectedPlayerId) || (availablePlayers || [])[0];
  const isCollapsPlayer = selectedPlayerId === 'collaps' || activePlayerObj?.id === 'collaps';
  const activePlayerTranslations = isCollapsPlayer
    ? []
    : ((activePlayerObj?.translations && activePlayerObj.translations.length > 0)
      ? activePlayerObj.translations
      : (movie.translationsList || []));

  const directStreamUrl = selectedPlayerId === 'videohub'
    ? videoHubStreamUrl
    : (isDirectMediaFile ? candidateUrl : undefined);

  const isFlixCdnPlayer =
    selectedPlayerId === 'flixcdn' ||
    Boolean(activePlayerObj?.iframeUrl && (activePlayerObj.iframeUrl.includes('tarantino') || activePlayerObj.iframeUrl.includes('flixcdn'))) ||
    Boolean(movie.videoUrl && (movie.videoUrl.includes('tarantino') || movie.videoUrl.includes('flixcdn')));

  let activeIframeSrc = '';
  if (selectedPlayerId === 'videohub') {
    activeIframeSrc = '';
  } else if (selectedPlayerId === 'collaps') {
    activeIframeSrc = collapsIframeSrc;
  } else if (selectedPlayerId === 'cdnmovies') {
    activeIframeSrc = cdnMoviesIframeSrc;
  } else if (isFlixCdnPlayer || (activePlayerObj?.iframeUrl && (activePlayerObj.iframeUrl.startsWith('http') || activePlayerObj.iframeUrl.startsWith('//')))) {
    const rawUrl = activePlayerObj?.iframeUrl || flixIframeSrc;
    try {
      const u = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
      if (isSeriesOrAnime || activeSeason > 1 || activeEpisode > 1) {
        u.searchParams.set('season', String(activeSeason));
        u.searchParams.set('episode', String(activeEpisode));
      }
      if (activeTranslation) {
        u.searchParams.set('translation', String(activeTranslation));
      }
      if (isFlixCdnPlayer) {
        u.searchParams.set('no_controls', '1');
        u.searchParams.set('no_control', '1');
        u.searchParams.set('no_control_translations', '1');
        u.searchParams.set('no_control_seasons', '1');
        u.searchParams.set('no_control_episodes', '1');
        u.searchParams.set('no_sharing', '1');
        u.searchParams.set('no_title', '1');
        u.searchParams.set('no_header', '1');
        u.searchParams.set('no_control_title', '1');
        u.searchParams.set('no_back', '1');
      }
      activeIframeSrc = u.toString();
    } catch (e) {
      activeIframeSrc = rawUrl;
    }
  }

  const handleSelectPlayer = (pId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('player', pId);
    params.delete('time');
    params.delete('t');
    const targetPlayerObj = (availablePlayers || []).find((p) => p.id === pId);
    if (targetPlayerObj?.translations && targetPlayerObj.translations.length > 0) {
      const hasMatch = targetPlayerObj.translations.some((t) => t.id === activeTranslation);
      if (!hasMatch) {
        params.set('translation', String(targetPlayerObj.translations[0].id));
      }
    }
    router.replace(`/cinema/watch/${movie.id}?${params.toString()}`);
  };

  const startTimeParam = searchParams.get('time') || searchParams.get('t');
  const startTimeVal = startTimeParam ? Number(startTimeParam) : undefined;

  return (
    <div className="relative w-screen h-[100dvh] bg-black overflow-hidden select-none">
      <style>{`#NAVP, [data-app-nav="mobile"], [data-app-nav="desktop"] { display: none !important; }`}</style>
      {/* CUSTOM PLAYER (HANDLES NATIVE HTML5 OR FALLBACK IFRAME WITH OUR CONTROLS) */}
      <CustomPlayer
        key={`${movie.id}:${activeSeason}:${activeEpisode}:${activeTranslation ?? 'default'}:${selectedPlayerId}`}
        src={directStreamUrl}
        fallbackIframeSrc={activeIframeSrc}
        title={movie.title}
        movieId={movie.id}
        season={activeSeason}
        episode={activeEpisode}
        startTime={startTimeVal}
        totalSeasons={hasMultipleSeasons ? availableSeasonsCount : 1}
        totalEpisodes={hasEpisodeSelection ? currentSeasonEpisodes.length : 1}
        isSeries={isSeriesOrAnime}
        translations={activePlayerTranslations}
        selectedTranslationId={activeTranslation}
        players={availablePlayers}
        selectedPlayerId={selectedPlayerId}
        qualities={selectedPlayerId === 'videohub' ? videoHubQualities : undefined}
        selectedQualityUrl={videoHubStreamUrl}
        onSelectQuality={(qUrl) => setVideoHubStreamUrl(qUrl)}
        onSelectPlayer={handleSelectPlayer}
        onNextEpisode={hasEpisodeSelection ? handleNextEpisode : undefined}
        onPrevEpisode={hasEpisodeSelection && activeEpisode > 1 ? handlePrevEpisode : undefined}
        onSelectTranslation={handleSelectTranslation}
        onSelectEpisodeModal={showModalPicker ? () => setShowPicker(true) : undefined}
        onBack={handleGoBack}
      />

      {/* OVERLAY EPISODES & SEASONS PICKER MODAL */}
      {showPicker && showModalPicker && (
        <div data-modal-picker="true" className="absolute inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col p-4 lg:p-8 space-y-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">{movie.title}</h2>
              {hasEpisodeSelection && (
                <p className="text-xs text-zinc-400">
                  {hasMultipleSeasons ? `Сезон ${activeSeason}, ` : ''}Серия {activeEpisode}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              tabIndex={0}
              autoFocus
              className="focusable-tv px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 cursor-pointer"
            >
              Закрыть ✕
            </button>
          </div>

          {/* SEASONS (ONLY IF >1 SEASON) */}
          {hasMultipleSeasons && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 block">Сезон:</span>
              <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-2 px-1 -mx-1">
                {Array.from({ length: availableSeasonsCount }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setCurrentSeason(sNum)}
                    tabIndex={0}
                    className={`focusable-tv px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${currentSeason === sNum
                        ? 'bg-white text-black shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                  >
                    Сезон {sNum}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EPISODES GRID (ONLY IF MULTIPLE EPISODES / SEASONS) */}
          {hasEpisodeSelection && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 block">Серии сезона {currentSeason}:</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {currentSeasonEpisodes.map((epNum) => {
                  const isCurrent = currentSeason === activeSeason && epNum === activeEpisode;
                  return (
                    <button
                      key={epNum}
                      onClick={() => handleSelectEpisode(currentSeason, epNum, activeTranslation)}
                      tabIndex={0}
                      className={`focusable-tv py-3 rounded-2xl font-black text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 focus:bg-indigo-600 focus:text-white ${isCurrent
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-lg'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                        }`}
                    >
                      {epNum}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PLAYERS / SOURCES SELECTOR */}
          {availablePlayers && availablePlayers.length > 1 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-zinc-400 block">Плеер / Источник:</span>
              <div className="flex flex-wrap items-center gap-2">
                {availablePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p.id)}
                    tabIndex={0}
                    className={`focusable-tv px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${selectedPlayerId === p.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>{p.name}</span>
                    {p.quality && <span className="text-[10px] text-zinc-500 font-medium">({p.quality})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TRANSLATIONS FOR ACTIVE PLAYER */}
          {activePlayerTranslations && activePlayerTranslations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-xs font-semibold text-zinc-400 block">Озвучка ({activePlayerObj?.name || 'Плеер'}):</span>
              <div className="flex flex-wrap items-center gap-2">
                {activePlayerTranslations.map((trans) => (
                  <button
                    key={trans.id}
                    onClick={() => {
                      handleSelectTranslation(trans.id);
                      setShowPicker(false);
                    }}
                    tabIndex={0}
                    className={`focusable-tv px-4 py-2 rounded-2xl font-bold text-xs transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-white focus:scale-105 ${activeTranslation === trans.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                  >
                    {trans.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
