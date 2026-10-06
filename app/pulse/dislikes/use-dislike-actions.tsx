'use client';

import { useCallback } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { artistChoices, type DislikeTrackLike } from './dislike-utils';
import {
  dislikeArtist,
  dislikeTrack,
  openPulseDislikeDialog,
  undislikeArtist,
  undislikeTrack,
  type PulseDislikedArtist,
} from './use-pulse-dislikes';

/** Действия «Не интересно» с уведомлениями и диалогами — одно место для строки трека, страницы трека и плеера. */
export function useDislikeActions() {
  const { lang } = useAuth();
  const { showNote } = useNotification();

  const failed = useCallback(() => {
    showNote({ content: lang?.errorhappend || 'Произошла ошибка', type: 'error', time: 4 });
  }, [lang, showNote]);

  const unmarkTrack = useCallback(async (track: DislikeTrackLike) => {
    if (await undislikeTrack(track)) {
      showNote({ content: lang?.pulse_track_undisliked_note || 'Трек возвращён в рекомендации', type: 'success', time: 3 });
    } else {
      failed();
    }
  }, [failed, lang, showNote]);

  /** true — трек отмечен сразу (false: нужен выбор «убрать из избранного» или ошибка). */
  const markTrack = useCallback(async (track: DislikeTrackLike): Promise<boolean> => {
    const result = await dislikeTrack(track);
    if (result.status === 'needs_choice') {
      openPulseDislikeDialog({ kind: 'favorite', track });
      return false;
    }
    if (result.status === 'error') {
      failed();
      return false;
    }
    showNote({
      content: (
        <span className="flex w-full items-center justify-between gap-3">
          <span>{lang?.pulse_track_disliked_note || 'Трек отмечен как неинтересный'}</span>
          <button
            type="button"
            onClick={() => void unmarkTrack(track)}
            className="cursor-pointer rounded-full border border-zinc-600/30 px-3 py-1.5 text-xs font-medium text-white duration-300 hover:bg-zinc-700 active:scale-95"
          >
            {lang?.pulse_dislike_undo || 'Отменить'}
          </button>
        </span>
      ),
      type: 'info',
      time: 6,
    });
    return true;
  }, [failed, lang, showNote, unmarkTrack]);

  const markArtist = useCallback(async (track: DislikeTrackLike, name: string, artistId: number | null) => {
    if (await dislikeArtist(track, name, artistId)) {
      showNote({ content: lang?.pulse_artist_disliked_note || 'Исполнитель убран из рекомендаций', type: 'info', time: 4 });
    } else {
      failed();
    }
  }, [failed, lang, showNote]);

  /** «Не рекомендовать исполнителя»: один исполнитель — сразу, несколько — выбор в окне. */
  const startArtistDislike = useCallback((track: DislikeTrackLike) => {
    const choices = artistChoices(track);
    if (choices.length === 0) return;
    if (choices.length === 1) {
      void markArtist(track, choices[0].name, choices[0].id);
      return;
    }
    openPulseDislikeDialog({ kind: 'artist', track });
  }, [markArtist]);

  const unmarkArtist = useCallback(async (artist: PulseDislikedArtist) => {
    if (await undislikeArtist(artist)) {
      showNote({ content: lang?.pulse_artist_undisliked_note || 'Исполнитель возвращён в рекомендации', type: 'success', time: 3 });
    } else {
      failed();
    }
  }, [failed, lang, showNote]);

  return { markArtist, markTrack, startArtistDislike, unmarkArtist, unmarkTrack };
}
