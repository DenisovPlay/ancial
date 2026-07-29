'use client';

import { Movie } from './types';
import { CacheManager } from '../lib/cache';

const API_BASE = '/api/V2/cinema';
const CINEMA_CACHE_TTL = 3600; // 1 hour TTL

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

  const type: 'movie' | 'series' =
    target.type === 'serial' || target.type === 'series' || target.type === 'animeserial' || target.type === 'showserial' || target.is_serial || item.type === 'serial' ? 'series' : 'movie';

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
  const originalTitleStr = target.original_name || target.orig_title || target.original_title || target.en_title || target.alternative_name || '';

  // Map translationsList
  const rawTranslations = target.translations || item.translations || [];
  const translationsList = Array.isArray(rawTranslations)
    ? rawTranslations.map((t: any) => ({
        id: t.id || t.translation_id || 0,
        title: t.title || t.name || t.tag || 'Перевод',
      })).filter((t: any) => t.id > 0)
    : [];

  // Map counters
  const counters = target.counters || item.counters || null;

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
  } else if (counters && counters.seasons) {
    const totalSeasons = counters.seasons || 1;
    const totalEp = counters.episodes || 1;
    const epPerSeason = Math.max(1, Math.ceil(totalEp / totalSeasons));
    for (let s = 1; s <= totalSeasons; s++) {
      const startEp = (s - 1) * epPerSeason + 1;
      const endEp = Math.min(totalEp, s * epPerSeason);
      const eps: number[] = [];
      for (let e = startEp; e <= endEp; e++) eps.push(e);
      episodesBySeason[s] = eps.length > 0 ? eps : [1];
    }
  }

  return {
    id: realId,
    title: titleStr,
    originalTitle: originalTitleStr,
    description: target.description || target.short_description || target.overview || 'Подробное описание данного тайтла временно подгружается...',
    rating,
    year,
    ageRating: target.rating_age_limits || target.age || '16+',
    duration: durationStr,
    quality: (target.best_quality || target.quality || 'FullHD') as any,
    genres,
    posterUrl,
    backdropUrl,
    videoUrl,
    type: type as any,
    director,
    cast,
    isNew: year >= 2024,
    counters,
    translationsList,
    episodesBySeason,
  };
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
  limit?: number;
  page?: number;
}): Promise<Movie[]> {
  const { search = '', type = '', genres = '', limit = 20, page = 1 } = filters;
  const cacheKey = `cinema_video_${search}_${type}_${genres}_${limit}_${page}`;
  const cached = CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'video' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/getVideo.php`, window.location.origin);
    if (search) url.searchParams.set('search', search);
    if (type) url.searchParams.set('type', type);
    if (genres) url.searchParams.set('genres', genres);
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
      CacheManager.set(cacheKey, foundMovie, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
    }
    return foundMovie;
  } catch (err) {
    console.error('fetchCinemaVideoById error:', err);
    return null;
  }
}
