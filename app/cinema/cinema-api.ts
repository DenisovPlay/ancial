'use client';

import { Movie, PlayerOption } from './types';
import { CacheManager } from '../lib/cache';

const API_BASE = '/api/V2/cinema';
const CINEMA_CACHE_TTL = 3600; // 1 hour TTL

export function getOptimizedImageUrl(url: string | undefined, sizeModifier: string = '@w300'): string {
  if (!url) return '/img/branding/frame.svg';
  if (url.includes('cdnhubstream.pro') && !url.includes('@')) {
    return `${url}${sizeModifier}`;
  }
  return url;
}

function formatFlixMovie(item: any): Movie {
  if (!item) {
    return {
      id: String(Math.random()),
      title: 'Без названия',
      originalTitle: '',
      description: '',
      rating: 7.5,
      year: 2024,
      ageRating: '16+',
      duration: '110 мин.',
      quality: 'FullHD',
      genres: ['Фильм'],
      posterUrl: '/img/branding/frame.svg',
      backdropUrl: '/img/branding/frame.svg',
      type: 'movie',
    };
  }

  const target = item.content || item;

  const realId = String(
    target.kinopoisk_id ||
    target.kinopoisk ||
    target.kp_id ||
    target.filmId ||
    item.kinopoisk_id ||
    item.kinopoisk ||
    item.kp_id ||
    target.id ||
    item.id ||
    Math.random()
  );

  const genresRaw = target.genres || target.genre || item.genres || item.genre || [];
  const genres = Array.isArray(genresRaw)
    ? genresRaw.map((g: any) => (typeof g === 'object' ? g.name : String(g)))
    : typeof genresRaw === 'string'
    ? genresRaw.split(',').map((s) => s.trim())
    : ['Фильм'];

  const ratingNum = parseFloat(
    target.rating_kp || target.rating_imdb || target.rating || item.rating_kp || (target.vote_average ? String(target.vote_average) : '7.5')
  );
  const rating = !isNaN(ratingNum) && ratingNum > 0 ? ratingNum : 7.5;

  const yearNum = parseInt(target.year || target.release_date || item.year || '2024', 10);
  const year = !isNaN(yearNum) ? yearNum : 2024;

  const posterUrl =
    target.image_url ||
    target.poster ||
    target.img ||
    target.poster_url ||
    target.posterUrl ||
    item.poster ||
    (realId ? `https://st.kp.yandex.net/images/film_big/${realId}.jpg` : '/img/branding/frame.svg');

  const backdropUrl =
    target.backdrop ||
    target.backdrop_url ||
    target.backdropUrl ||
    target.big_poster ||
    posterUrl;

  const rawType = String(target.type || item.type || target.tupe || item.tupe || '').toLowerCase();
  const isSerial = rawType.includes('serial') || rawType === 'series' || rawType.includes('show') || target.is_serial || item.is_serial;
  const isAnime = genres.some((g) => g.toLowerCase().includes('аниме')) || rawType.includes('anime');
  const isCartoon = genres.some((g) => g.toLowerCase().includes('мультфильм') || g.toLowerCase().includes('анимация'));

  let type: Movie['type'] = 'movie';
  if (isAnime) type = 'anime';
  else if (isCartoon) type = 'cartoons';
  else if (isSerial) type = 'series';

  const director = target.director || (Array.isArray(target.directors) ? target.directors.map((d: any) => d.name_ru || d.name_en || d).join(', ') : 'Режиссёр');
  
  // v2 API uses "personalities" array with role="actor"
  const cast = Array.isArray(target.personalities)
    ? target.personalities.filter((p: any) => p.role === 'actor').map((p: any) => p.name_ru || p.name_en)
    : Array.isArray(target.cast)
    ? target.cast
    : Array.isArray(target.actors)
    ? target.actors.map((a: any) => a.name_ru || a.name_en || a)
    : typeof target.actors === 'string'
    ? target.actors.split(',').map((s: string) => s.trim())
    : ['В главных ролях'];

  let videoUrl = target.adress || target.player_url || target.iframe_url || target.url || target.link || target.stream_url || item.iframe_url || '';
  if (!videoUrl && realId) {
    videoUrl = `https://vidsrc.me/embed/movie?kp=${realId}`;
  }

  const durationStr = target.film_length ? `${target.film_length} мин.` : typeof target.duration === 'number' ? `${target.duration} мин.` : String(target.duration || '110 мин.');
  const titleStr = target.ru_name || target.title_rus || target.title || target.name || target.ru_title || item.title || 'Без названия';
  const originalTitleStr = target.original_name || target.orig_title || target.original_title || target.en_title || target.alternative_name || target.title_orig || '';

  // Map translationsList
  const rawTranslations = target.translations || item.translations || [];
  const translationsList = Array.isArray(rawTranslations)
    ? rawTranslations.map((t: any) => ({
        id: t.id || t.translation_id || 0,
        title: t.title || t.name || t.tag || 'Перевод',
      })).filter((t: any) => t.id > 0)
    : [];

  // Map counters
  const counters = target.counters || item.counters || (isSerial ? { seasons: target.seasons_count || 1, episodes: target.episodes_count || 10 } : null);

  // Map files -> episodesBySeason
  const files = target.files || item.files || [];
  const episodesBySeason: Record<number, number[]> = {};

  if (Array.isArray(files) && files.length > 0) {
    files.forEach((f: any) => {
      const s = f.season_number || f.season || 1;
      const e = f.series_number || f.episode || f.series || 1;
      if (!episodesBySeason[s]) episodesBySeason[s] = [];
      if (!episodesBySeason[s].includes(e)) episodesBySeason[s].push(e);
    });
    Object.keys(episodesBySeason).forEach((sKey) => {
      episodesBySeason[Number(sKey)].sort((a, b) => a - b);
    });
  }

  if (isSerial && Object.keys(episodesBySeason).length === 0) {
    const totalSeasons = counters?.seasons || 1;
    const totalEp = counters?.episodes || 10;
    const epPerSeason = Math.max(1, Math.ceil(totalEp / totalSeasons));
    for (let s = 1; s <= totalSeasons; s++) {
      const startEp = (s - 1) * epPerSeason + 1;
      const endEp = Math.min(totalEp, s * epPerSeason);
      const eps: number[] = [];
      for (let e = startEp; e <= endEp; e++) eps.push(e);
      episodesBySeason[s] = eps.length > 0 ? eps : Array.from({ length: 10 }, (_, i) => i + 1);
    }
  }

  // Update badge for fresh updates (/api/updates)
  const seasonUpdate = item.season || target.season;
  const episodeUpdate = item.episode || target.episode;
  const translationTitle = item.translation?.title || target.translation?.title;
  const updateBadge = (seasonUpdate || episodeUpdate || translationTitle) ? {
    season: seasonUpdate ? Number(seasonUpdate) : undefined,
    episode: episodeUpdate ? Number(episodeUpdate) : undefined,
    translationTitle: translationTitle ? String(translationTitle) : undefined,
  } : undefined;

  const rawActors = target.actors || item.actors || (Array.isArray(target.personalities) ? target.personalities.filter((p: any) => p.role === 'actor') : []);
  const actorsList = Array.isArray(rawActors)
    ? rawActors.map((a: any) => ({
        id: typeof a === 'object' ? (a.id || a.kinopoisk_id || a.kp_id) : undefined,
        kinopoisk_id: typeof a === 'object' ? a.kinopoisk_id : undefined,
        name: typeof a === 'object' ? (a.name_ru || a.name_en || a.name || '') : String(a),
        name_en: typeof a === 'object' ? a.name_en : undefined,
        posterUrl: typeof a === 'object' ? (a.poster_url || a.img) : undefined,
        character: typeof a === 'object' ? a.character_name : undefined,
      })).filter((a) => a.name.trim().length > 0)
    : typeof rawActors === 'string'
    ? rawActors.split(',').map((s: string) => ({ name: s.trim() })).filter((a: { name: string }) => a.name.length > 0)
    : [];

  const rawDirectors = target.directors || item.directors || (Array.isArray(target.personalities) ? target.personalities.filter((p: any) => p.role === 'director') : []);
  const directorsList = Array.isArray(rawDirectors)
    ? rawDirectors.map((d: any) => ({
        id: typeof d === 'object' ? (d.id || d.kinopoisk_id || d.kp_id) : undefined,
        kinopoisk_id: typeof d === 'object' ? d.kinopoisk_id : undefined,
        name: typeof d === 'object' ? (d.name_ru || d.name_en || d.name || '') : String(d),
        name_en: typeof d === 'object' ? d.name_en : undefined,
        posterUrl: typeof d === 'object' ? (d.poster_url || d.img) : undefined,
      })).filter((d: any) => d.name.trim().length > 0)
    : typeof target.director === 'string'
    ? target.director.split(',').map((s: string) => ({ name: s.trim() })).filter((d: { name: string }) => d.name.length > 0)
    : [];

  const kpId = target.kinopoisk_id || target.kp_id || target.kinopoiskId || realId;
  const defaultPlayers: PlayerOption[] = [
    {
      id: 'flixcdn',
      name: 'Плеер 1 (FlixCDN)',
      provider: 'FlixCDN',
      iframeUrl: videoUrl || `https://tarantino.factorios.live/show/kinopoisk/${kpId}`,
      quality: 'FullHD 1080p',
      isAvailable: true,
    },
    {
      id: 'cdnmovies',
      name: 'Плеер 2 (CDNMovies)',
      provider: 'CDNMovies',
      iframeUrl: `https://cdnmovies-stream.online/kinopoisk/${kpId}/iframe`,
      quality: 'WebDL 1080p',
      isAvailable: true,
    },
  ];

  return {
    id: realId,
    title: titleStr,
    originalTitle: originalTitleStr,
    description: (target.description || target.short_description || target.overview || '').trim(),
    rating,
    year: year > 0 ? year : undefined,
    duration: durationStr,
    quality: (target.best_quality || target.quality || 'FullHD') as any,
    genres,
    posterUrl,
    backdropUrl,
    videoUrl,
    type,
    director,
    cast,
    actorsList,
    directorsList,
    isNew: year >= 2024,
    kinopoisk_id: kpId,
    files: target.files || [],
    counters,
    translationsList,
    episodesBySeason,
    rawPersonalities: target.personalities || item.personalities || [],
    updateBadge,
    players: defaultPlayers,
  };
  }

export async function fetchCinemaPlayers(
  id?: string | number,
  kinopoiskId?: string | number,
  imdbId?: string,
  season?: number,
  episode?: number
): Promise<PlayerOption[]> {
  try {
    const url = new URL(`${API_BASE}/players.php`, window.location.origin);
    if (kinopoiskId) url.searchParams.set('kinopoisk_id', String(kinopoiskId));
    if (imdbId) url.searchParams.set('imdb_id', imdbId);
    if (id) url.searchParams.set('id', String(id));
    if (season) url.searchParams.set('season', String(season));
    if (episode) url.searchParams.set('episode', String(episode));

    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.players) && data.players.length > 0) {
        return data.players;
      }
    }
  } catch (err) {
    console.warn('fetchCinemaPlayers error:', err);
  }

  const kp = kinopoiskId || id;
  const fallbackPlayers: PlayerOption[] = [];
  if (kp) {
    fallbackPlayers.push({
      id: 'flixcdn',
      name: 'Плеер 1 (FlixCDN)',
      provider: 'FlixCDN',
      iframeUrl: `https://tarantino.factorios.live/show/kinopoisk/${kp}`,
      isAvailable: true,
    });
    let cdnUrl = `https://cdnmovies-stream.online/kinopoisk/${kp}/iframe`;
    if (season || episode) {
      cdnUrl += `?season=${season || 1}&episode=${episode || 1}`;
    }
    fallbackPlayers.push({
      id: 'cdnmovies',
      name: 'Плеер 2 (CDNMovies)',
      provider: 'CDNMovies',
      iframeUrl: cdnUrl,
      isAvailable: true,
    });
  }
  return fallbackPlayers;
}

export async function fetchCinemaSearch(
  query: string,
  type?: string,
  page: number = 1,
  options?: { years?: string; orderby?: string; orderby_direction?: string; limit?: number }
): Promise<Movie[]> {
  if (query.trim()) {
    return fetchCinemaVideos({
      page,
      limit: options?.limit || 20,
      sort: '-rating_kp,-rating_imdb',
      'filter[title]': query.trim(),
      ...(type ? { type } : {})
    });
  }

  const years = options?.years || '';
  const orderby = options?.orderby || '';
  const orderbyDir = options?.orderby_direction || '';
  const limit = options?.limit || 20;

  const cacheKey = `cinema_search_${query}_${type || 'all'}_${years}_${orderby}_${orderbyDir}_p${page}_l${limit}`;
  const cached = CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'search' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/search.php`, window.location.origin);
    if (query) url.searchParams.set('title', query);
    if (type) url.searchParams.set('type', type);
    if (years) url.searchParams.set('years', years);
    if (orderby) url.searchParams.set('orderby', orderby);
    if (orderbyDir) url.searchParams.set('orderby_direction', orderbyDir);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', String((page - 1) * limit));
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result || data?.items || [];
    const movies = items.map(formatFlixMovie);

    if (movies.length > 0) {
      CacheManager.set(cacheKey, movies, { category: 'cinema', subcategory: 'search', ttl: CINEMA_CACHE_TTL });
    }
    return movies;
  } catch (err) {
    console.error('fetchCinemaSearch error:', err);
    return [];
  }
}

export function cacheCinemaSearchResults(query: string, results: Movie[], type?: string, page: number = 1) {
  if (!query.trim() || !results || results.length === 0) return;
  const cacheKey = `cinema_search_${query}_${type || 'all'}_p${page}`;
  CacheManager.set(cacheKey, results, { category: 'cinema', subcategory: 'search', ttl: CINEMA_CACHE_TTL });
}

export async function fetchCinemaGetVideo(filters: {
  search?: string;
  type?: string;
  genres?: string;
  countries?: string;
  years?: string;
  limit?: number;
  page?: number;
}): Promise<Movie[]> {
  const { search = '', type = '', genres = '', countries = '', years = '', limit = 20, page = 1 } = filters;
  const cacheKey = `cinema_video_${search}_${type}_${genres}_${countries}_${years}_${limit}_${page}`;
  const cached = CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'video' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/getVideo.php`, window.location.origin);
    if (search) url.searchParams.set('search', search);
    if (type) url.searchParams.set('type', type);
    if (genres) url.searchParams.set('genres', genres);
    if (countries) url.searchParams.set('countries', countries);
    if (years) url.searchParams.set('years', years);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data?.items || data?.result || data?.data || [];
    const movies = items.map(formatFlixMovie);

    if (movies.length > 0) {
      CacheManager.set(cacheKey, movies, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
    }
    return movies;
  } catch (err) {
    console.error('fetchCinemaGetVideo error:', err);
    return [];
  }
}

export async function fetchCinemaVideos(params: {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: string;
  year_from?: number | string;
  year_to?: number | string;
  type?: string;
  [key: string]: any;
}): Promise<Movie[]> {
  const queryStr = new URLSearchParams(params as any).toString();
  const cacheKey = `cinema_v2_videos_${queryStr}`;
  const cached = CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'video' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/videos.php?${queryStr}`, window.location.origin);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.data || data?.result || data?.items || [];
    const movies = Array.isArray(items) ? items.map(formatFlixMovie) : [];

    if (movies.length > 0) {
      CacheManager.set(cacheKey, movies, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
    }
    return movies;
  } catch (err) {
    console.error('fetchCinemaVideos error:', err);
    return [];
  }
}

export async function fetchCinemaUpdates(): Promise<{ movies: Movie[]; serials: Movie[] }> {
  const cacheKey = `cinema_updates`;
  const cached = CacheManager.get<{ movies: Movie[]; serials: Movie[] }>(cacheKey, { category: 'cinema', subcategory: 'updates' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/updates.php`, window.location.origin);
    const res = await fetch(url.toString());
    if (!res.ok) return { movies: [], serials: [] };
    const data = await res.json();

    const rawMovies = data?.result?.movies || [];
    const rawSerials = data?.result?.serials || [];

    const movies = rawMovies.map((item: any) => formatFlixMovie(item));
    const serials = rawSerials.map((item: any) => formatFlixMovie(item));
    const result = { movies, serials };

    if (movies.length > 0 || serials.length > 0) {
      CacheManager.set(cacheKey, result, { category: 'cinema', subcategory: 'updates', ttl: CINEMA_CACHE_TTL });
    }

    return result;
  } catch (err) {
    console.error('fetchCinemaUpdates error:', err);
    return { movies: [], serials: [] };
  }
}

export async function fetchCinemaCartoons(filters?: {
  page?: number;
  limit?: number;
  genre?: string;
  type?: 'movie' | 'serial' | 'all';
}): Promise<Movie[]> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const genre = filters?.genre || 'мультфильм';
  
  return fetchCinemaGetVideo({
    genres: genre,
    page,
    limit,
  });
}

export async function fetchCinemaByCountry(country: string, limit: number = 15, page: number = 1): Promise<Movie[]> {
  return fetchCinemaGetVideo({
    countries: country,
    limit,
    page,
  });
}

export async function fetchCinemaByGenre(genre: string, limit: number = 15, page: number = 1): Promise<Movie[]> {
  return fetchCinemaGetVideo({
    genres: genre,
    limit,
    page,
  });
}

export function formatCdnMoviesItem(item: any): Movie {
  const kpId = item.kinopoisk_id || item.id;
  const posterUrl = item.posters?.[0]?.large || item.posters?.[0]?.medium || item.image_url || '/img/branding/frame.svg';
  const typeMap: Record<string, string> = {
    'фильм': 'movie',
    'сериал': 'series',
    'аниме': 'anime',
    'аниме сериал': 'animeserial',
    'тв телепередача': 'showserial',
  };
  const itemType = typeMap[item.content_type?.toLowerCase()] || item.type || 'movie';

  return {
    id: String(kpId),
    title: item.ru_title || item.ru_name || item.en_title || item.name || 'Фильм',
    originalTitle: item.en_title || item.orig_title || item.name || '',
    description: (item.description || item.slogan || '').trim(),
    rating: item.kinopoisk_rating || item.rating_kp || item.imdb_rating || '7.5',
    year: item.year || undefined,
    genres: Array.isArray(item.genres) ? item.genres.map((g: any) => typeof g === 'object' ? g.name : g) : [],
    posterUrl,
    type: itemType,
    kinopoisk_id: kpId,
    players: [
      {
        id: 'cdnmovies',
        name: 'Плеер 2 (CDNMovies)',
        provider: 'CDNMovies',
        iframeUrl: item.iframe_src ? item.iframe_src.replace('//cdnmovies-stream.online', '//ugly-turkey.cdnmovies-stream.online') : `https://ugly-turkey.cdnmovies-stream.online/kinopoisk/${kpId}/iframe`,
        quality: 'WebDL 1080p',
        isAvailable: true,
      },
      {
        id: 'flixcdn',
        name: 'Плеер 1 (FlixCDN)',
        provider: 'FlixCDN',
        iframeUrl: `https://tarantino.factorios.live/show/kinopoisk/${kpId}`,
        quality: 'FullHD 1080p',
        isAvailable: true,
      },
    ],
  };
}

export async function fetchCinemaPersonById(
  personId: string,
  role?: string,
  initialName?: string,
  initialPoster?: string
): Promise<{ person: any; movies: Movie[] } | null> {
  if (!personId) return null;
  const decodedId = decodeURIComponent(personId).trim();
  const cacheKey = `cinema_person_v5_${decodedId}_${initialName || ''}_${role || 'all'}`;
  const cached = CacheManager.get<{ person: any; movies: Movie[] }>(cacheKey, { category: 'cinema', subcategory: 'person' });
  if (cached) return cached;

  try {
    let movies: Movie[] = [];
    let foundPerson: any = null;
    const isNumeric = /^\d+$/.test(decodedId);

    // 1. Fetch matching person from /api/personalities (querying FlixCDN personalities)
    for (let page = 1; page <= 3; page++) {
      try {
        const url = new URL(`${API_BASE}/personalities.php`, window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', '100');
        if (role) url.searchParams.set('role', role);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const items = data?.result || data?.data || [];
          if (!Array.isArray(items) || items.length === 0) break;

          const matchedItem = items.find((p: any) => 
            String(p.id) === String(decodedId) || 
            String(p.kinopoisk_id) === String(decodedId) ||
            (p.name_ru && p.name_ru.trim().toLowerCase() === decodedId.toLowerCase()) ||
            (p.name_en && p.name_en.trim().toLowerCase() === decodedId.toLowerCase()) ||
            (initialName && p.name_ru && p.name_ru.trim().toLowerCase() === initialName.trim().toLowerCase()) ||
            (initialName && p.name_en && p.name_en.trim().toLowerCase() === initialName.trim().toLowerCase())
          );

          if (matchedItem) {
            const pName = (matchedItem.name_ru && matchedItem.name_ru.trim()) ? matchedItem.name_ru.trim() : matchedItem.name_en;
            foundPerson = {
              id: matchedItem.id || decodedId,
              name_ru: pName || initialName || decodedId,
              name_en: matchedItem.name_en || '',
              poster_url: matchedItem.poster_url || initialPoster || '/img/branding/frame.svg',
              role: role || 'actor',
            };

            // Fetch EXACT video IDs linked to this personality
            if (Array.isArray(matchedItem.videos) && matchedItem.videos.length > 0) {
              const videoIds = matchedItem.videos.map((v: any) => typeof v === 'object' ? (v.video_id || v.id) : v).filter(Boolean);
              if (videoIds.length > 0) {
                const videoPromises = videoIds.slice(0, 30).map((vid: any) => fetchCinemaVideoById(String(vid)));
                const fetchedResults = await Promise.all(videoPromises);
                movies = fetchedResults.filter((m): m is Movie => m !== null);
              }
            }
            break;
          }
        }
      } catch (e) {
        console.warn('Personalities fetch error:', e);
      }
    }

    // 2. Query CDNMovies search as well to find complementary movies starring this actor
    const searchQuery = initialName || (isNumeric ? '' : decodedId);
    if (searchQuery) {
      try {
        const cdnUrl = new URL(`${API_BASE}/cdnmovies.php`, window.location.origin);
        cdnUrl.searchParams.set('action', 'search');
        cdnUrl.searchParams.set('query', searchQuery);
        const cdnRes = await fetch(cdnUrl.toString());
        if (cdnRes.ok) {
          const cdnData = await cdnRes.json();
          const cdnItems = cdnData?.data || cdnData?.items || [];
          if (Array.isArray(cdnItems) && cdnItems.length > 0) {
            const formattedCdnMovies = cdnItems.map((c: any) => formatCdnMoviesItem(c));
            const existingIds = new Set(movies.map((m) => String(m.id || m.kinopoisk_id)));
            for (const cMovie of formattedCdnMovies) {
              const cId = String(cMovie.id || cMovie.kinopoisk_id);
              if (!existingIds.has(cId)) {
                existingIds.add(cId);
                movies.push(cMovie);
              }
            }
          }
        }
      } catch (e) {
        console.warn('CDNMovies person search error:', e);
      }
    }

    // 3. ABSOLUTE FILTER: Reject any movie that doesn't actually feature this person!
    const targetName = (initialName || foundPerson?.name_ru || foundPerson?.name_en || (isNumeric ? '' : decodedId)).toLowerCase().trim();
    if (targetName || isNumeric) {
      movies = movies.filter((m) => {
        if (!m) return false;
        const pList = m.rawPersonalities || (m as any).personalities || [];
        if (Array.isArray(pList) && pList.length > 0) {
          const matchInMovie = pList.some((p: any) => 
            (isNumeric && (String(p.id) === String(decodedId) || String(p.kinopoisk_id) === String(decodedId))) ||
            (targetName && p.name_ru && p.name_ru.trim().toLowerCase().includes(targetName)) ||
            (targetName && p.name_en && p.name_en.trim().toLowerCase().includes(targetName))
          );
          if (matchInMovie) return true;
        }
        if (targetName) {
          const titleStr = (m.title || '').toLowerCase();
          const origTitleStr = (m.originalTitle || '').toLowerCase();
          const actorsStr = (m.cast || []).join(' ').toLowerCase();
          const directorStr = (m.director || '').toLowerCase();
          return actorsStr.includes(targetName) || directorStr.includes(targetName) || titleStr.includes(targetName) || origTitleStr.includes(targetName);
        }
        return true;
      });
    }

    // 4. Ensure non-empty person envelope
    const displayName = foundPerson?.name_ru || initialName || (isNumeric ? (movies[0]?.title ? `Персона из «${movies[0].title}»` : `Персона #${decodedId}`) : decodedId);
    const posterUrl = foundPerson?.poster_url || initialPoster || (movies.length > 0 ? movies[0].posterUrl : '/img/branding/frame.svg');

    foundPerson = {
      id: foundPerson?.id || decodedId,
      name_ru: displayName,
      name_en: foundPerson?.name_en || '',
      poster_url: posterUrl,
      role: foundPerson?.role || role || 'actor',
    };

    const result = { person: foundPerson, movies };
    if (movies.length > 0 || foundPerson) {
      CacheManager.set(cacheKey, result, { category: 'cinema', subcategory: 'person', ttl: CINEMA_CACHE_TTL });
    }
    return result;
  } catch (err) {
    console.error('fetchCinemaPersonById error:', err);
    return null;
  }
}

export async function fetchCinemaTranslations(): Promise<{ id: number; title: string }[]> {
  const cacheKey = `cinema_translations`;
  const cached = CacheManager.get<{ id: number; title: string }[]>(cacheKey, { category: 'cinema', subcategory: 'translations' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/translations.php`, window.location.origin);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result || data?.data || [];

    if (Array.isArray(items) && items.length > 0) {
      CacheManager.set(cacheKey, items, { category: 'cinema', subcategory: 'translations', ttl: CINEMA_CACHE_TTL * 24 });
    }
    return items;
  } catch (err) {
    console.error('fetchCinemaTranslations error:', err);
    return [];
  }
}

export async function fetchCinemaGenres(): Promise<{ id: number; name: string }[]> {
  const cacheKey = `cinema_genres`;
  const cached = CacheManager.get<{ id: number; name: string }[]>(cacheKey, { category: 'cinema', subcategory: 'genres' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/genres.php`, window.location.origin);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result || data?.data || [];

    if (Array.isArray(items) && items.length > 0) {
      CacheManager.set(cacheKey, items, { category: 'cinema', subcategory: 'genres', ttl: CINEMA_CACHE_TTL * 24 });
    }
    return items;
  } catch (err) {
    console.error('fetchCinemaGenres error:', err);
    return [];
  }
}

export async function fetchCinemaVideoById(id: string): Promise<Movie | null> {
  if (!id) return null;
  const cacheKey = `cinema_video_by_id_${id}`;
  const cached = CacheManager.get<Movie>(cacheKey, { category: 'cinema', subcategory: 'video' });
  if (cached) return cached;

  try {
    let foundMovie: Movie | null = null;
    let internalId = id;

    // STEP 1: Search strictly by kinopoisk_id
    const searchUrl = new URL(`${API_BASE}/search.php`, window.location.origin);
    searchUrl.searchParams.set('kinopoisk_id', id);
    const searchRes = await fetch(searchUrl.toString());
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const items = searchData?.result || searchData?.items || [];
      const exactMatch = items.find((m: any) => String(m.kinopoisk_id || m.id) === String(id));
      if (exactMatch) {
        foundMovie = formatFlixMovie(exactMatch);
        if (exactMatch.id) internalId = String(exactMatch.id);
      }
    }

    // STEP 2: Fetch v2 video details from video_v2.php (provides counters, files, translations)
    const genUrl = new URL(`${API_BASE}/video_v2.php`, window.location.origin);
    genUrl.searchParams.set('id', internalId);
    const genRes = await fetch(genUrl.toString());
    if (genRes.ok) {
      const genData = await genRes.json();
      const v2Data = genData?.data || genData;
      if (v2Data && !Array.isArray(v2Data) && v2Data.id) {
        const v2Movie = formatFlixMovie(v2Data);
        if (foundMovie) {
          foundMovie = {
            ...foundMovie,
            counters: v2Movie.counters || foundMovie.counters,
            translationsList: (v2Movie.translationsList && v2Movie.translationsList.length > 0) ? v2Movie.translationsList : foundMovie.translationsList,
            episodesBySeason: (v2Movie.episodesBySeason && Object.keys(v2Movie.episodesBySeason).length > 0) ? v2Movie.episodesBySeason : foundMovie.episodesBySeason,
          };
        } else {
          foundMovie = v2Movie;
        }
      }
    }

    if (foundMovie) {
      const verifiedPlayers = await fetchCinemaPlayers(internalId, foundMovie.kinopoisk_id);
      if (verifiedPlayers && verifiedPlayers.length > 0) {
        foundMovie.players = verifiedPlayers;
      }
      CacheManager.set(cacheKey, foundMovie, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
    }
    return foundMovie;
  } catch (err) {
    console.error('fetchCinemaVideoById error:', err);
    return null;
  }
}

