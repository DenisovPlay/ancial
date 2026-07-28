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
    target.kp_id ||
    target.filmId ||
    item.kinopoisk_id ||
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
    target.type === 'serial' || target.type === 'series' || target.is_serial || item.type === 'serial' ? 'series' : 'movie';

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

  let videoUrl = target.player_url || target.iframe_url || target.url || target.link || target.stream_url || item.iframe_url || '';
  if (!videoUrl && realId) {
    videoUrl = `https://vidsrc.me/embed/movie?kp=${realId}`;
  }

  const durationStr = target.film_length ? `${target.film_length} мин.` : typeof target.duration === 'number' ? `${target.duration} мин.` : String(target.duration || '110 мин.');
  const titleStr = target.ru_name || target.title_rus || target.title || target.name || target.ru_title || item.title || 'Без названия';
  const originalTitleStr = target.original_name || target.orig_title || target.original_title || target.en_title || target.alternative_name || '';

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
  };
}

export async function fetchCinemaSearch(query: string, type?: string, page: number = 1): Promise<Movie[]> {
  const cacheKey = `cinema_search_${query}_${type || 'all'}_p${page}`;
  const cached = CacheManager.get<Movie[]>(cacheKey, { category: 'cinema', subcategory: 'search' });
  if (cached) return cached;

  try {
    const url = new URL(`${API_BASE}/search.php`, window.location.origin);
    if (query) url.searchParams.set('title', query);
    if (type) url.searchParams.set('type', type);
    url.searchParams.set('page', String(page));
    url.searchParams.set('offset', String((page - 1) * 20));
    url.searchParams.set('limit', '20');

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.result || data?.items || [];
    const movies = items.map(formatFlixMovie);

    // Убрали автоматическое кэширование (CacheManager.set), 
    // чтобы не засорять кэш опечатками и промежуточными буквами ("м", "ма", "мат" и т.д.)
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
    // STEP 1: Search strictly by kinopoisk_id
    const searchUrl = new URL(`${API_BASE}/search.php`, window.location.origin);
    searchUrl.searchParams.set('kinopoisk_id', id);
    const searchRes = await fetch(searchUrl.toString());
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const items = searchData?.result || searchData?.items || [];
      const exactMatch = items.find((m: any) => String(m.kinopoisk_id || m.id) === String(id));
      if (exactMatch) {
        const found = formatFlixMovie(exactMatch);
        CacheManager.set(cacheKey, found, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
        return found;
      }
    }

    // STEP 2: Fallback search in video.php with strict ID matching
    const genUrl = new URL(`${API_BASE}/video.php`, window.location.origin);
    genUrl.searchParams.set('id', id);
    const genRes = await fetch(genUrl.toString());
    if (genRes.ok) {
      const genData = await genRes.json();
      
      // video.php (v2 эндпоинт) возвращает один объект в data, а не массив
      const v2Data = genData?.data || genData;
      
      // Проверяем, что вернулся объект с правильным ID (kinopoisk_id или внутренним id)
      if (v2Data && !Array.isArray(v2Data) && (String(v2Data.kinopoisk_id || v2Data.kp_id) === String(id) || String(v2Data.id) === String(id))) {
        const found = formatFlixMovie(v2Data);
        CacheManager.set(cacheKey, found, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
        return found;
      }
      
      // На случай если бэкенд всё-таки вернул массив (fallback)
      const items = Array.isArray(genData?.data?.items) ? genData.data.items : Array.isArray(genData?.result) ? genData.result : Array.isArray(genData?.items) ? genData.items : [];
      const exactMatch = items.find((m: any) => String(m.kinopoisk_id || m.id) === String(id));
      if (exactMatch) {
        const found = formatFlixMovie(exactMatch);
        CacheManager.set(cacheKey, found, { category: 'cinema', subcategory: 'video', ttl: CINEMA_CACHE_TTL });
        return found;
      }
    }

    return null;
  } catch (err) {
    console.error('fetchCinemaVideoById error:', err);
    return null;
  }
}
