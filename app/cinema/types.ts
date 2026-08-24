export type ContentType = 'all' | 'movie' | 'series' | 'anime' | 'cartoons';

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: string;
  thumbnailUrl: string;
  description: string;
  videoUrl: string;
}

export interface Season {
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface MovieTranslation {
  id: number;
  title: string;
}

export interface PlayerOption {
  id: 'flixcdn' | 'cdnmovies' | string;
  name: string;
  provider: 'FlixCDN' | 'CDNMovies' | string;
  iframeUrl: string;
  quality?: string;
  isAvailable: boolean;
  translations?: MovieTranslation[];
}

export interface PersonChip {
  id?: string | number;
  kinopoisk_id?: string | number;
  name: string;
  name_en?: string;
  posterUrl?: string;
  character?: string;
}

export interface PersonVideoItem {
  id: string;
  character_name?: string;
  role?: 'actor' | 'director' | string;
  movie?: Movie;
}

export interface Person {
  id: string;
  kinopoisk_id?: string;
  name_ru: string;
  name_en?: string;
  poster_url?: string;
  videos?: (PersonVideoItem | string | number)[];
  role?: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  description?: string;
  rating?: number | string;
  year?: number | string;
  ageRating?: string;
  duration?: string;
  quality?: '4K HDR' | 'FullHD' | 'HD' | string;
  genres: string[];
  posterUrl: string;
  backdropUrl?: string;
  videoUrl?: string;
  kinopoisk_id?: string | number;
  files?: MovieFile[];
  isNew?: boolean;
  isTop?: boolean;
  topRank?: number;
  type: 'movie' | 'series' | 'anime' | 'animeserial' | 'cartoons' | 'showserial' | string;
  director?: string;
  cast?: string[];
  actorsList?: PersonChip[];
  directorsList?: PersonChip[];
  seasons?: Season[];
  players?: PlayerOption[];
  progress?: number;
  matchPercentage?: number;
  audioLangs?: string[];
  subtitles?: string[];
  counters?: {
    seasons?: number;
    episodes?: number;
    last_season?: number;
    last_episode?: number;
  };
  translationsList?: MovieTranslation[];
  episodesBySeason?: Record<number, number[]>;
  rawPersonalities?: RawPersonality[];
  updateBadge?: {
    season?: number;
    episode?: number;
    translationTitle?: string;
  };
}

export interface GenreCategory {
  id: string;
  name: string;
  icon?: string;
}

/** Элемент поля files в ответе video_v2.php (прямой стрим сезона/серии/перевода). */
export interface MovieFile {
  id?: number | string;
  season_number?: number | string;
  series_number?: number | string;
  episode?: number | string;
  url?: string;
  quality?: string;
  translation?: { id?: number | string; title?: string } | null;
  [key: string]: unknown;
}

/**
 * «Сырая» запись персоны из /api/V2/cinema (personalities.php, поле personalities
 * внутри видео). Поля опциональны: разные источники отдают разный набор.
 */
export interface RawPersonality {
  id?: number | string;
  kinopoisk_id?: number | string;
  kp_id?: number | string;
  name_ru?: string;
  name_en?: string;
  name?: string;
  role?: string;
  poster_url?: string;
  img?: string;
  character_name?: string;
  videos?: (RawPersonalityVideoRef | number | string)[];
  [key: string]: unknown;
}

/** Ссылка на видео в записи персоны: объект или число/строка. */
export type RawPersonalityVideoRef = { video_id?: number | string; id?: number | string };

/**
 * «Сырая» запись фильма из внешних источников FlixCDN / v2 API.
 * Единая точка правды для formatFlixMovie(): все варианты имён полей
 * (kinopoisk_id/kp_id/filmId, ru_name/title_rus и т.д.) собраны здесь.
 */
export interface RawMovieRecord {
  id?: number | string;
  content?: RawMovieRecord;
  kinopoisk_id?: number | string;
  kinopoisk?: number | string;
  kinopoiskId?: number | string;
  kp_id?: number | string;
  filmId?: number | string;
  genres?: string | Array<string | { name?: string }>;
  genre?: string | Array<string | { name?: string }>;
  rating_kp?: number | string;
  rating_imdb?: number | string;
  rating?: number | string;
  vote_average?: number | string;
  year?: number | string;
  release_date?: number | string;
  image_url?: string;
  poster?: string;
  img?: string;
  poster_url?: string;
  posterUrl?: string;
  backdrop?: string;
  backdrop_url?: string;
  backdropUrl?: string;
  big_poster?: string;
  type?: string;
  tupe?: string;
  is_serial?: boolean | number | string;
  director?: string;
  directors?: Array<RawPersonality | string>;
  cast?: string[];
  actors?: string | Array<RawPersonality | string>;
  personalities?: RawPersonality[];
  adress?: string;
  player_url?: string;
  iframe_url?: string;
  url?: string;
  link?: string;
  stream_url?: string;
  film_length?: number | string;
  duration?: number | string;
  ru_name?: string;
  title_rus?: string;
  title?: string;
  name?: string;
  ru_title?: string;
  original_name?: string;
  orig_title?: string;
  original_title?: string;
  en_title?: string;
  alternative_name?: string;
  title_orig?: string;
  description?: string;
  short_description?: string;
  overview?: string;
  best_quality?: string;
  quality?: string;
  translations?: Array<{ id?: number | string; translation_id?: number | string; title?: string; name?: string; tag?: string }>;
  counters?: { seasons?: number | string; episodes?: number | string };
  seasons_count?: number | string;
  episodes_count?: number | string;
  files?: MovieFile[];
  season?: number | string;
  episode?: number | string;
  translation?: { id?: number | string; title?: string } | null;
  players?: PlayerOption[];
  // --- CDNMovies-вариант (formatCdnMoviesItem) ---
  posters?: Array<{ large?: string; medium?: string }>;
  content_type?: string;
  slogan?: string;
  kinopoisk_rating?: number | string;
  imdb_rating?: number | string;
  iframe_src?: string;
  [key: string]: unknown;
}


