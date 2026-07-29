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
  files?: any[];
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
  rawPersonalities?: any[];
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

