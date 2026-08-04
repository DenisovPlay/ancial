'use client';

import { cache } from '../lib/cache';
import {
  CinemaProgressState,
  mergeCinemaProgress,
} from './cinema-progress';

export interface WatchHistoryItem {
  id: string;
  title: string;
  originalTitle?: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number | string;
  year?: number | string;
  ageRating?: string;
  duration?: string;
  type: string; // 'movie' | 'series' | 'animeserial' | 'cartoons' | ...
  season?: number;
  episode?: number;
  translationId?: number | null;
  translationTitle?: string;
  playerId?: string;
  playerName?: string;
  time?: number; // текущий таймкод остановки в секундах
  currentTime?: number;
  durationSeconds?: number;
  isEpisodic?: boolean;
  preserveActiveSelection?: boolean;
  timestamp: number;
}

const CINEMA_HISTORY_CACHE_KEY = 'cinema_watch_history';

/**
 * Получить список истории просмотра кино из кэш-менеджера.
 */
export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const history = cache.get<WatchHistoryItem[]>(CINEMA_HISTORY_CACHE_KEY, {
      category: 'cinema',
      subcategory: 'history',
    });

    if (Array.isArray(history)) {
      // Обогащаем таймкодами из индивидуального прогресса, если они есть
      return history.map((item) => {
        const prog = getMovieProgress(item.id);
        if (!prog) return item;
        return {
          ...item,
          season: prog.season !== undefined ? prog.season : item.season,
          episode: prog.episode !== undefined ? prog.episode : item.episode,
          translationId: prog.translationId !== undefined ? prog.translationId : item.translationId,
          translationTitle: prog.translationTitle || item.translationTitle,
          playerId: prog.playerId || item.playerId,
          playerName: prog.playerName || item.playerName,
          time: prog.time !== undefined ? prog.time : (prog.currentTime !== undefined ? prog.currentTime : item.time),
          currentTime: prog.currentTime !== undefined ? prog.currentTime : (prog.time !== undefined ? prog.time : item.currentTime),
          durationSeconds: prog.duration !== undefined ? prog.duration : item.durationSeconds,
        };
      });
    }
  } catch (e) {
    console.warn('Failed to read cinema watch history from cache manager:', e);
  }
  return [];
}

/**
 * Получить сохраненный прогресс для конкретного видео.
 */
export function getMovieProgress(movieId: string | number): CinemaProgressState | null {
  try {
    const rawKey = `cinema_progress_${movieId}`;
    const data = cache.get<CinemaProgressState>(rawKey, {
      category: 'cinema',
      subcategory: 'progress',
    });
    return data || null;
  } catch (e) {
    return null;
  }
}

/**
 * Атомарное сохранение элемента истории и прогресса просмотра через системный кэш-менеджер.
 */
export function saveWatchHistoryItem(item: Partial<WatchHistoryItem> & { id: string | number; title: string }) {
  if (typeof window === 'undefined') return;

  const targetId = String(item.id);
  const now = Date.now();

  // 1. Считываем существующую информацию из прогресса для слияния
  const existingProg = getMovieProgress(targetId) || {};

  const updatedProgress = mergeCinemaProgress(existingProg, {
    type: item.type,
    isEpisodic: item.isEpisodic,
    season: item.season,
    episode: item.episode,
    translationId: item.translationId,
    translationTitle: item.translationTitle,
    playerId: item.playerId,
    playerName: item.playerName,
    time: item.time,
    currentTime: item.currentTime,
    durationSeconds: item.durationSeconds,
    preserveActiveSelection: item.preserveActiveSelection,
  }, now);
  const season = updatedProgress.season || 1;
  const episode = updatedProgress.episode || 1;
  const translationId = updatedProgress.translationId ?? null;
  const translationTitle = updatedProgress.translationTitle || '';
  const playerId = updatedProgress.playerId || 'flixcdn';
  const playerName = updatedProgress.playerName || '';
  const savedTime = updatedProgress.currentTime || 0;
  const durSeconds = updatedProgress.duration || 0;

  cache.set(`cinema_progress_${targetId}`, updatedProgress, {
    category: 'cinema',
    subcategory: 'progress',
    isPersistent: true,
  });

  // 3. Сохраняем в список истории просмотра (без дубликатов)
  const currentHistory = getWatchHistory();
  const filtered = currentHistory.filter((h) => String(h.id) !== targetId);

  const existingItem = currentHistory.find((h) => String(h.id) === targetId);

  const fullHistoryItem: WatchHistoryItem = {
    id: targetId,
    title: item.title,
    originalTitle: item.originalTitle || existingItem?.originalTitle || '',
    description: item.description || existingItem?.description || '',
    posterUrl: item.posterUrl || existingItem?.posterUrl || '',
    backdropUrl: item.backdropUrl || existingItem?.backdropUrl || item.posterUrl || existingItem?.posterUrl || '',
    rating: item.rating !== undefined ? item.rating : existingItem?.rating,
    year: item.year !== undefined ? item.year : existingItem?.year,
    ageRating: item.ageRating || existingItem?.ageRating || '',
    duration: item.duration || existingItem?.duration || '',
    type: item.type || existingItem?.type || 'movie',
    season,
    episode,
    translationId,
    translationTitle,
    playerId,
    playerName,
    time: Math.floor(savedTime),
    currentTime: Math.floor(savedTime),
    durationSeconds: Math.floor(durSeconds),
    timestamp: now,
  };

  const newHistoryList = [fullHistoryItem, ...filtered].slice(0, 50);

  cache.set(CINEMA_HISTORY_CACHE_KEY, newHistoryList, {
    category: 'cinema',
    subcategory: 'history',
    isPersistent: true,
  });

  // Диспатчим событие обновления истории для UI страниц
  try {
    window.dispatchEvent(new CustomEvent('ancial:cinema_history_update', { detail: { item: fullHistoryItem } }));
  } catch (e) {}
}
