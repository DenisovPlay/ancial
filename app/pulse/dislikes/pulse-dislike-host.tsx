'use client';

import { useState } from 'react';

import RoundCheck from '../../components/round-check';
import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { artistChoices, isTrackMarkedItself, matchingDislikedArtists } from './dislike-utils';
import { useDislikeActions } from './use-dislike-actions';
import {
  closePulseDislikeDialog,
  dislikeTrack,
  rememberPulseChoice,
  usePulseDislikeDialog,
  usePulseDislikes,
  type PulseDislikeDialog,
} from './use-pulse-dislikes';

const PRIMARY_BUTTON = 'w-full cursor-pointer rounded-full bg-purple-500 px-4 py-2 font-medium text-white duration-300 hover:bg-purple-400 active:scale-95';
const SECONDARY_BUTTON = 'w-full cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 font-medium text-white duration-300 hover:bg-zinc-700 active:scale-95';

/** Диалоги «Не интересно»: один экземпляр на сайт (монтируется рядом с плеером); без открытого окна ничего не делает. */
export default function PulseDislikeHost() {
  const dialog = usePulseDislikeDialog();
  return dialog ? <DislikeDialogs dialog={dialog} /> : null;
}

function DislikeDialogs({ dialog }: { dialog: PulseDislikeDialog }) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const state = usePulseDislikes();
  const { markArtist, unmarkArtist, unmarkTrack } = useDislikeActions();
  const [remember, setRemember] = useState(false);

  const close = () => {
    setRemember(false);
    closePulseDislikeDialog();
  };

  if (dialog.kind === 'favorite') {
    const { track } = dialog;
    const choose = async (favorite: 'remove' | 'keep') => {
      const result = await dislikeTrack(track, { favorite, remember });
      close();
      if (result.status === 'error') {
        showNote({ content: lang?.errorhappend || 'Произошла ошибка', type: 'error', time: 4 });
      } else {
        showNote({ content: lang?.pulse_track_disliked_note || 'Трек отмечен как неинтересный', type: 'info', time: 4 });
      }
    };
    return (
      <Modal isOpen onClose={close} title={lang?.pulse_dislike_favorite_title || 'Трек в избранном'} width="sm">
        <div className="flex flex-col gap-3">
          <p className="text-zinc-300">{lang?.pulse_dislike_favorite_desc || 'Убрать его из избранного?'}</p>
          <RoundCheck checked={remember} label={lang?.pulse_remember_choice || 'Запомнить мой выбор'} onChange={setRemember} />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={PRIMARY_BUTTON} onClick={() => void choose('remove')}>
              {lang?.pulse_dislike_favorite_remove || 'Убрать'}
            </button>
            <button type="button" className={SECONDARY_BUTTON} onClick={() => void choose('keep')}>
              {lang?.pulse_dislike_favorite_keep || 'Оставить'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (dialog.kind === 'play') {
    const { play, track } = dialog;
    const markedItself = isTrackMarkedItself(track, state);
    const matchedArtists = matchingDislikedArtists(track, state.artists);
    const playAnyway = () => {
      if (remember) void rememberPulseChoice({ play_disliked: 'play' });
      close();
      play();
    };
    return (
      <Modal isOpen onClose={close} title={lang?.pulse_disliked_play_title || 'Трек отмечен как неинтересный'} width="sm">
        <div className="flex flex-col gap-3">
          <p className="text-zinc-300">
            {lang?.pulse_disliked_play_desc || 'Он не попадает в подборки и пропускается в очереди. Включить всё равно?'}
          </p>
          <RoundCheck checked={remember} label={lang?.pulse_remember_choice || 'Запомнить мой выбор'} onChange={setRemember} />
          <button type="button" className={PRIMARY_BUTTON} onClick={playAnyway}>
            {lang?.pulse_disliked_play_anyway || 'Всё равно включить'}
          </button>
          {markedItself ? (
            <button type="button" className={SECONDARY_BUTTON} onClick={() => { close(); void unmarkTrack(track); }}>
              {lang?.pulse_disliked_remove_mark || 'Снять отметку'}
            </button>
          ) : null}
          {matchedArtists.map((artist) => (
            <button key={artist.key} type="button" className={SECONDARY_BUTTON} onClick={() => { close(); void unmarkArtist(artist); }}>
              {`${lang?.pulse_undislike_artist || 'Вернуть исполнителя'}: ${artist.label || artist.key}`}
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  // Выбор исполнителя для «Не рекомендовать».
  const { track } = dialog;
  return (
    <Modal isOpen onClose={close} title={lang?.pulse_dislike_artist_title || 'Не рекомендовать исполнителя'} width="sm">
      <div className="flex flex-col gap-3">
        <p className="text-zinc-300">{lang?.pulse_dislike_artist_desc || 'Выберите исполнителя — его треки пропадут из подборок и радио.'}</p>
        {artistChoices(track).map((choice) => (
          <button
            key={`${choice.id ?? 'n'}:${choice.name}`}
            type="button"
            className={SECONDARY_BUTTON}
            onClick={() => { close(); void markArtist(track, choice.name, choice.id); }}
          >
            {choice.name}
          </button>
        ))}
      </div>
    </Modal>
  );
}
