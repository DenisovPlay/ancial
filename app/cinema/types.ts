export type ContentType = 'all' | 'movie' | 'series' | 'anime';

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
  type: 'movie' | 'series' | 'anime' | 'animeserial';
  director?: string;
  cast?: string[];
  seasons?: Season[];
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
}

export interface GenreCategory {
  id: string;
  name: string;
  icon?: string;
}
