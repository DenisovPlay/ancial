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

export interface Movie {
  id: string;
  title: string;
  originalTitle: string;
  description: string;
  rating: number;
  year: number;
  ageRating: string;
  duration: string;
  quality: '4K HDR' | 'FullHD' | 'HD';
  genres: string[];
  posterUrl: string;
  backdropUrl: string;
  videoUrl?: string;
  isNew?: boolean;
  isTop?: boolean;
  topRank?: number;
  type: 'movie' | 'series' | 'anime';
  director?: string;
  cast?: string[];
  seasons?: Season[];
  progress?: number;
  matchPercentage?: number;
  audioLangs?: string[];
  subtitles?: string[];
}

export interface GenreCategory {
  id: string;
  name: string;
  icon?: string;
}
