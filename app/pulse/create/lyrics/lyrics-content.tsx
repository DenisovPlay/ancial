'use client';

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { usePulsePlayer } from '../../../context/PulsePlayerContext';
import { AncialAPI, getApiMessage, type PulseLyricsResponse } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import { cn } from '../../../lib/cn';
import {
  buildLrc,
  draftToText,
  formatLrcTime,
  isSyncedLyrics,
  parseLrcDraft,
  parseLyricsText,
  type LrcDraftLine,
} from '../../../lib/lrc';
import Modal from '../../../components/modal';
import Icon from '../../../components/svg-icon';
import { lyricsCacheKey } from '../../player/lyrics-service';
import { PulseLyricsDesktop, PulseLyricsPlain } from '../../player/pulse-lyrics';

type Mode = 'text' | 'sync' | 'preview';
type Confirm = 'draft' | 'replace' | 'plain' | 'reset' | null;
type CreatorTrack = { id?: number | string; name?: string; artist?: string; src?: string };
type Lang = Record<string, string> | null | undefined;

const DRAFT_PREFIX = 'zypo_lyrics_draft:';
const NUDGE_STEP = 0.1;
const SEEK_STEP = 3;
const MAX_IMPORT_BYTES = 256 * 1024;
const PLAYBACK_RATES = [0.5, 0.75, 1];

const PILL = 'flex items-center justify-center gap-2 rounded-full border border-zinc-600/30 px-4 py-2 text-sm font-medium duration-300 active:scale-95 cursor-pointer disabled:cursor-default disabled:opacity-50 disabled:active:scale-100';
const PILL_IDLE = 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700';
const PILL_ACTIVE = 'bg-white text-black hover:bg-zinc-200';
const CHIP = 'rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300';
const SMALL = 'rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95 cursor-pointer disabled:cursor-default disabled:opacity-50 disabled:active:scale-100';
const ICON_BUTTON = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800 text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95 cursor-pointer disabled:cursor-default disabled:opacity-50 disabled:active:scale-100';

// Черновик — удобство одного браузера: разметка долгая, и терять её при перезагрузке обидно.
function readDraft(id: number): string | null {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + id);
  } catch {
    return null;
  }
}

function writeDraft(id: number, value: string | null) {
  try {
    // Пустой черновик не хранится: восстанавливать нечего.
    if (value === null || value.trim() === '') window.localStorage.removeItem(DRAFT_PREFIX + id);
    else window.localStorage.setItem(DRAFT_PREFIX + id, value);
  } catch { /* best-effort: приватный режим может запрещать запись */ }
}

/** Плеер кэширует текст на сутки — после правки автор должен сразу увидеть свою версию. */
function forgetPlayerLyrics(id: number) {
  try {
    cache.remove(lyricsCacheKey(id), { category: 'pulse', subcategory: 'lyrics' });
  } catch { /* best-effort */ }
}

/** 83.4 → «1:23». */
function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Плеер редактора: свой <audio>, чтобы темп и перемотка не трогали основной плеер Pulse. */
function Transport({
  currentTime,
  duration,
  lang,
  onRate,
  onSeek,
  onToggle,
  playing,
  rate,
}: {
  currentTime: number;
  duration: number;
  lang: Lang;
  onRate: (rate: number) => void;
  onSeek: (time: number) => void;
  onToggle: () => void;
  playing: boolean;
  rate: number;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? (lang?.creators_lyrics_pause || 'Пауза') : (lang?.creators_lyrics_play || 'Воспроизвести')}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black duration-300 hover:bg-zinc-200 active:scale-95 cursor-pointer"
      >
        <Icon name={playing ? 'IC-pause' : 'IC-play'} className={cn('h-5 w-5 fill-current', !playing && 'ml-0.5')} />
      </button>
      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-300">{formatClock(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label={lang?.creators_lyrics_seek_track || 'Перемотка'}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-white"
      />
      <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-zinc-500">{formatClock(duration)}</span>
      <select
        value={rate}
        onChange={(event) => onRate(Number(event.target.value))}
        aria-label={lang?.creators_lyrics_speed || 'Скорость'}
        title={lang?.creators_lyrics_speed || 'Скорость'}
        className="h-10 w-14 shrink-0 cursor-pointer appearance-none rounded-full border border-zinc-600/30 bg-zinc-800 text-center text-xs text-zinc-200 focus:outline-0"
      >
        {PLAYBACK_RATES.map((value) => (
          <option key={value} value={value} className="bg-zinc-900">
            {value}×
          </option>
        ))}
      </select>
    </div>
  );
}

/** Строка разметки. Выбранная — та, что получит время по «Отметить»; у неё же точная подстройка. */
function SyncRow({
  isNow,
  isSelected,
  lang,
  line,
  onClear,
  onNudge,
  onSeek,
  onSelect,
  onSetNow,
  rowRef,
}: {
  isNow: boolean;
  isSelected: boolean;
  lang: Lang;
  line: LrcDraftLine;
  onClear: () => void;
  onNudge: (delta: number) => void;
  onSeek: () => void;
  onSelect: () => void;
  onSetNow: () => void;
  rowRef: React.Ref<HTMLDivElement> | undefined;
}) {
  const timed = line.time !== null;
  return (
    <div
      ref={rowRef}
      className={cn(
        'flex scroll-my-24 flex-col gap-3 rounded-3xl border px-3 py-2 duration-300',
        isSelected ? 'border-zinc-600/30 bg-zinc-800' : 'border-transparent hover:bg-zinc-800/50',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={timed ? onSeek : onSelect}
          title={timed ? (lang?.creators_lyrics_seek || 'Перейти к строке') : undefined}
          className={cn(
            'shrink-0 cursor-pointer rounded-full border border-zinc-600/30 px-3 py-1 font-mono text-xs tabular-nums duration-300',
            timed ? 'bg-zinc-900 text-zinc-200 hover:bg-zinc-700' : 'text-zinc-600',
          )}
        >
          {timed ? formatLrcTime(line.time as number) : '--:--.--'}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'min-w-0 flex-1 cursor-pointer break-words text-left text-base leading-snug duration-300',
            isNow ? 'font-semibold text-white' : isSelected ? 'text-zinc-100' : timed ? 'text-zinc-300' : 'text-zinc-500',
          )}
        >
          {line.text}
        </button>
      </div>
      {isSelected ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onSetNow} className={SMALL}>
            {lang?.creators_lyrics_set_now || 'Поставить текущее время'}
          </button>
          {timed ? (
            <>
              <button type="button" onClick={() => onNudge(-NUDGE_STEP)} aria-label={lang?.creators_lyrics_earlier || 'Раньше на 0,1 с'} className={SMALL}>
                −0.1
              </button>
              <button type="button" onClick={() => onNudge(NUDGE_STEP)} aria-label={lang?.creators_lyrics_later || 'Позже на 0,1 с'} className={SMALL}>
                +0.1
              </button>
              <button type="button" onClick={onClear} className={SMALL}>
                {lang?.creators_lyrics_clear_time || 'Убрать время'}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Редактор текста трека в Creators: ввод, разметка по времени, предпросмотр как в плеере. */
export default function LyricsContent() {
  const { lang, isAuthenticated } = useAuth();
  const { showNote } = useNotification();
  const { currentSongId, currentTrackObj, isPlaying: isPulsePlaying, togglePlay: togglePulse } = usePulsePlayer();
  const id = Number.parseInt(useSearchParams().get('id') ?? '', 10) || 0;

  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<CreatorTrack | null>(null);
  const [saved, setSaved] = useState<PulseLyricsResponse | null>(null);
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [lines, setLines] = useState<LrcDraftLine[]>([]);
  const [cursor, setCursor] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<'save' | 'search' | 'reset' | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pendingText, setPendingText] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const followCursorRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Мини-плеер Pulse внизу экрана на телефоне: закреплённая панель поднимается над ним.
  const isPulseBarVisible = Boolean(currentSongId || currentTrackObj);

  const errorNote = (err: unknown, fallback: string) => {
    showNote({
      content: getApiMessage(err instanceof Error ? err.message : null, lang, fallback),
      type: 'error',
      time: 5,
    });
  };

  const applyLoaded = useEffectEvent((tracks: CreatorTrack[] | null, lyrics: PulseLyricsResponse | null) => {
    setTrack(Array.isArray(tracks) ? tracks.find((item) => Number(item.id) === id) ?? null : null);
    setSaved(lyrics);
    const serverText = lyrics?.lyrics ?? '';
    setText(serverText);
    // Черновик не подставляем молча: спрашиваем, если в нём есть текст и он отличается от сохранённого.
    const draft = readDraft(id);
    if (draft !== null && draft.trim() !== '' && draft.trim() !== serverText.trim()) {
      setPendingText(draft);
      setConfirm('draft');
    } else if (draft !== null) {
      writeDraft(id, null);
    }
  });

  useEffect(() => {
    if (!isAuthenticated || id <= 0) return undefined;
    let cancelled = false;
    Promise.all([
      AncialAPI.pulseManagement<CreatorTrack[]>('track', 'list', {}),
      // Сервис текстов лёг — редактор всё равно открывается, просто пустым.
      AncialAPI.pulseLyrics(id).catch(() => null),
    ])
      .then(([tracks, lyrics]) => {
        if (!cancelled) applyLoaded(tracks, lyrics);
      })
      .catch((err: unknown) => console.error('Failed to load lyrics editor', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (dirty && id > 0) writeDraft(id, mode === 'text' ? text : draftToText(lines));
  }, [dirty, id, mode, text, lines]);

  // К выбранной строке прокручиваем только после «Отметить» / «Шаг назад»: по клику она и так перед глазами.
  useEffect(() => {
    if (!followCursorRef.current) return;
    followCursorRef.current = false;
    selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [cursor, lines]);

  const timedCount = lines.filter((line) => line.time !== null).length;
  const previewLines = useMemo(() => parseLyricsText(draftToText(lines)), [lines]);
  const previewSynced = isSyncedLyrics(previewLines);
  const hasContent = mode === 'text' ? text.trim() !== '' : lines.length > 0;
  const source = saved?.source ?? '';
  // Строка, которая звучит сейчас: последняя по времени среди уже наступивших.
  const nowIndex = useMemo(() => {
    let found = -1;
    lines.forEach((line, index) => {
      if (line.time === null || line.time > currentTime + 0.05) return;
      if (found < 0 || (lines[found].time as number) <= line.time) found = index;
    });
    return found;
  }, [lines, currentTime]);

  const updateLines = (updater: (prev: LrcDraftLine[]) => LrcDraftLine[]) => {
    setLines(updater);
    setDirty(true);
  };

  const setLineTime = (index: number, time: number | null) => {
    updateLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, time } : line)));
  };

  /** Поле «Текст» становится строками при уходе с вкладки и собирается обратно при возврате. */
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (mode === 'text') {
      const parsed = parseLrcDraft(text);
      const firstOpen = parsed.findIndex((line) => line.time === null);
      setLines(parsed);
      setCursor(firstOpen === -1 ? 0 : firstOpen);
    }
    if (next === 'text') setText(draftToText(lines));
    setMode(next);
  };

  /** Новый текст (поиск, файл) всегда открывается в поле — в разметке он уже со своими тайм-кодами. */
  const applyText = (value: string) => {
    setText(value);
    setDirty(true);
    setMode('text');
    setConfirm(null);
    setPendingText('');
  };

  const offerText = (value: string) => {
    if (!hasContent) {
      applyText(value);
      return;
    }
    setPendingText(value);
    setConfirm('replace');
  };

  // --- Аудио ---

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || time));
    setCurrentTime(audio.currentTime);
  };

  const seekAndPlay = (time: number) => {
    seek(time);
    void audioRef.current?.play().catch(() => {});
  };

  const changeRate = (value: number) => {
    setRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  };

  // --- Разметка ---

  const markLine = () => {
    const audio = audioRef.current;
    if (!audio || lines.length === 0) return;
    const index = Math.min(cursor, lines.length - 1);
    setLineTime(index, Math.round(audio.currentTime * 100) / 100);
    followCursorRef.current = true;
    // После последней строки курсор остаётся на ней — повторное «Отметить» просто переставит её время.
    setCursor(Math.min(index + 1, lines.length - 1));
  };

  /** Шаг назад: снять время с последней отмеченной строки и отмотать чуть раньше неё, чтобы отметить заново. */
  const undoMark = () => {
    const index = cursor > 0 && lines[cursor]?.time === null ? cursor - 1 : cursor;
    const undone = lines[index]?.time;
    if (undone === null || undone === undefined) return;
    seek(undone - SEEK_STEP);
    setLineTime(index, null);
    followCursorRef.current = true;
    setCursor(index);
  };

  const nudge = (index: number, delta: number) => {
    const current = lines[index]?.time;
    if (current === null || current === undefined) return;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setLineTime(index, next);
    // Сразу слышно, куда сдвинулась строка.
    seekAndPlay(Math.max(0, next - 1));
  };

  const resetTimes = () => {
    updateLines((prev) => prev.map((line) => ({ ...line, time: null })));
    setCursor(0);
  };

  // Горячие клавиши: пробел/Enter — отметить (в предпросмотре — пауза), Backspace — шаг назад, ← → — перемотка.
  const onEditorKey = useEffectEvent((event: KeyboardEvent) => {
    if (confirm !== null || mode === 'text' || lines.length === 0) return;
    if (event.target instanceof HTMLElement && event.target.closest('input:not([type="range"]), textarea, select')) return;
    const onRange = event.target instanceof HTMLInputElement && event.target.type === 'range';

    if (event.code === 'Space' || event.key === 'Enter') {
      // Иначе пробел заодно нажмёт кнопку в фокусе.
      event.preventDefault();
      if (event.repeat) return;
      if (mode === 'sync') markLine();
      else togglePlayback();
    } else if (mode === 'sync' && event.key === 'Backspace') {
      event.preventDefault();
      undoMark();
    } else if (!onRange && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      seek((audioRef.current?.currentTime ?? 0) + (event.key === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP));
    }
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => onEditorKey(event);
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // --- Сервер ---

  const runSearch = () => {
    setBusy('search');
    AncialAPI.pulseManagement<PulseLyricsResponse>('lyrics', 'search', { id: String(id) })
      .then((found) => offerText(found.lyrics))
      .catch((err: unknown) => errorNote(err, lang?.lyrics_not_found || 'Текст не найден'))
      .finally(() => setBusy(null));
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      showNote({ content: lang?.lyrics_too_long || 'Текст слишком длинный', type: 'error', time: 5 });
      return;
    }
    offerText(await file.text());
  };

  const save = (allowPlain = false) => {
    const draft = mode === 'text' ? parseLrcDraft(text) : lines;
    if (draft.length === 0) {
      showNote({ content: lang?.creators_lyrics_empty || 'Добавьте текст песни', type: 'warning', time: 4 });
      return;
    }
    const timed = draft.filter((line) => line.time !== null).length;
    if (timed > 0 && timed < draft.length && !allowPlain) {
      setConfirm('plain');
      return;
    }
    setConfirm(null);
    setBusy('save');
    const lyrics = buildLrc(draft);
    AncialAPI.pulseManagement<{ synced: boolean }>('lyrics', 'update', { id: String(id), lyrics })
      .then((result) => {
        writeDraft(id, null);
        setDirty(false);
        forgetPlayerLyrics(id);
        setSaved({ lyrics, synced: result.synced, source: 'author' });
        showNote({ content: lang?.creators_lyrics_saved || 'Текст сохранён', type: 'success', time: 3 });
      })
      .catch((err: unknown) => errorNote(err, lang?.errorhappend || 'Произошла ошибка'))
      .finally(() => setBusy(null));
  };

  const resetToAuto = () => {
    setConfirm(null);
    setBusy('reset');
    AncialAPI.pulseManagement('lyrics', 'delete', { id: String(id) })
      .then(() => AncialAPI.pulseLyrics(id).catch(() => null))
      .then((lyrics) => {
        writeDraft(id, null);
        forgetPlayerLyrics(id);
        setSaved(lyrics);
        setText(lyrics?.lyrics ?? '');
        setDirty(false);
        setMode('text');
        showNote({ content: lang?.creators_lyrics_reset_auto_done || 'Текст возвращён к автопоиску', type: 'success', time: 3 });
      })
      .catch((err: unknown) => errorNote(err, lang?.errorhappend || 'Произошла ошибка'))
      .finally(() => setBusy(null));
  };

  if (!isAuthenticated) return null;
  if (!id || (!loading && !track)) {
    return <div className="p-6 text-center text-zinc-500">{lang?.creators_track_not_found || 'Трек не найден'}</div>;
  }

  const sourceLabel = source === 'author'
    ? (lang?.creators_lyrics_source_author || 'Ваш текст')
    : source === 'musixmatch' || source === 'lrclib'
      ? (lang?.creators_lyrics_source_auto || 'Найден автоматически')
      : (lang?.creators_lyrics_source_none || 'Текст не найден');
  const isSavedState = !dirty && source === 'author';

  // Тексты подтверждений — только строки: действие выбирает обработчик, а не объект в рендере.
  const confirmCopy: Record<Exclude<Confirm, null>, { title: string; body: string; action: string; cancel?: string }> = {
    draft: {
      title: lang?.creators_lyrics_confirm_draft_title || 'Восстановить черновик?',
      body: (lang?.creators_lyrics_confirm_draft || 'Есть несохранённый черновик этого текста ({count} строк). Открыть его вместо сохранённого текста?')
        .replace('{count}', String(parseLrcDraft(pendingText).length)),
      action: lang?.creators_lyrics_restore_draft || 'Восстановить',
      cancel: lang?.creators_lyrics_discard_draft || 'Удалить черновик',
    },
    replace: {
      title: lang?.creators_lyrics_confirm_replace_title || 'Заменить текст?',
      body: lang?.creators_lyrics_confirm_replace || 'Текущий текст и разметка будут заменены.',
      action: lang?.creators_lyrics_replace || 'Заменить',
    },
    plain: {
      title: lang?.creators_lyrics_confirm_plain_title || 'Не все строки отмечены',
      body: lang?.creators_lyrics_confirm_plain || 'Сохранить как текст без синхронизации? Разметка не сохранится — слушатели увидят текст целиком.',
      action: lang?.creators_lyrics_save_plain || 'Сохранить без синхронизации',
    },
    reset: {
      title: lang?.creators_lyrics_confirm_reset_title || 'Вернуть автопоиск?',
      body: lang?.creators_lyrics_confirm_reset || 'Ваш текст удалится, и Pulse снова будет искать текст автоматически.',
      action: lang?.creators_lyrics_reset_auto || 'Вернуть автопоиск',
    },
  };
  const confirmText = confirm ? confirmCopy[confirm] : null;

  const runConfirm = () => {
    if (confirm === 'draft' || confirm === 'replace') applyText(pendingText);
    else if (confirm === 'plain') save(true);
    else if (confirm === 'reset') resetToAuto();
  };

  const tabs: Array<{ id: Mode; label: string }> = [
    { id: 'text', label: lang?.creators_lyrics_tab_text || 'Текст' },
    { id: 'sync', label: lang?.creators_lyrics_tab_sync || 'Синхронизация' },
    { id: 'preview', label: lang?.creators_lyrics_preview || 'Предпросмотр' },
  ];

  const transport = track?.src ? (
    <Transport
      currentTime={currentTime}
      duration={duration}
      lang={lang}
      onRate={changeRate}
      onSeek={seek}
      onToggle={togglePlayback}
      playing={playing}
      rate={rate}
    />
  ) : null;

  const preview = previewSynced ? (
    <PulseLyricsDesktop audioRef={audioRef} lines={previewLines} onSeek={seekAndPlay} widthClassName="w-full" />
  ) : (
    <PulseLyricsPlain
      label={lang?.pulse_lyrics_unsynced || 'Текст без синхронизации'}
      lines={previewLines}
      variant="desktop"
      widthClassName="w-full"
    />
  );

  // Закреплённая панель: на телефоне — внизу, над навигацией и мини-плеером; на ПК — сверху, под меню Creators.
  const dockClass = cn(
    'sticky z-30 order-last flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/95 p-3 shadow backdrop-blur-md',
    isPulseBarVisible ? 'bottom-32' : 'bottom-21',
    'lg:order-none lg:bottom-auto lg:top-16',
  );

  let body: React.ReactNode;
  if (mode === 'text') {
    body = (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          {transport ? <div className="rounded-3xl border border-zinc-600/30 p-3">{transport}</div> : null}
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setDirty(true);
            }}
            spellCheck={false}
            placeholder={lang?.creators_lyrics_placeholder || 'Вставьте текст песни — по строке на строку'}
            className="min-h-[55vh] w-full resize-y rounded-3xl border border-zinc-600/30 bg-zinc-800/90 p-3 text-base leading-7 text-zinc-100 placeholder-zinc-600 focus:outline-0"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={runSearch} disabled={busy !== null} className={cn(PILL, PILL_IDLE)}>
              <Icon name={busy === 'search' ? 'IC-loader' : 'IC-search'} className={cn('h-4 w-4 fill-current', busy === 'search' && 'animate-spin')} />
              {lang?.creators_lyrics_search || 'Найти автоматически'}
            </button>
            <input ref={fileInputRef} type="file" accept=".lrc,.txt,text/plain" onChange={importFile} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy !== null} className={cn(PILL, PILL_IDLE)}>
              <Icon name="IC-file" className="h-4 w-4 fill-current" />
              {lang?.creators_lyrics_import || 'Загрузить .lrc'}
            </button>
            <span className="text-xs text-zinc-500">
              {(lang?.creators_lyrics_line_count || 'Строк: {count}').replace('{count}', String(parseLrcDraft(text).length))}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 p-3 text-sm text-zinc-400 lg:self-start">
          <span className="font-semibold text-zinc-200">{lang?.creators_lyrics_how_title || 'Как добавить текст'}</span>
          <span>{lang?.creators_lyrics_how_1 || '1. Вставьте текст, найдите его автоматически или загрузите .lrc-файл.'}</span>
          <span>{lang?.creators_lyrics_how_2 || '2. На вкладке «Синхронизация» отметьте, когда начинается каждая строка.'}</span>
          <span>{lang?.creators_lyrics_how_3 || '3. Проверьте результат в предпросмотре и сохраните.'}</span>
          <span className="text-xs text-zinc-500">
            {lang?.creators_lyrics_hint_text || 'Тайм-коды вида [01:23.45] можно вставить сразу — например, из .lrc-файла.'}
          </span>
        </div>
      </div>
    );
  } else if (lines.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-zinc-600/30 p-6 text-center">
        <span className="text-sm text-zinc-400">{lang?.creators_lyrics_sync_empty || 'Сначала добавьте текст на вкладке «Текст».'}</span>
        <button type="button" onClick={() => switchMode('text')} className={cn(PILL, PILL_IDLE)}>
          {lang?.creators_lyrics_tab_text || 'Текст'}
        </button>
      </div>
    );
  } else if (mode === 'sync') {
    body = (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="flex flex-col gap-3">
          <div className={dockClass}>
            {transport}
            <div className="flex items-center gap-3">
              <button type="button" onClick={markLine} disabled={!track?.src} className={cn(PILL, PILL_ACTIVE, 'min-w-0 flex-1 py-2.5 text-base')}>
                <Icon name="IC-check" className="h-5 w-5 shrink-0 fill-current" />
                <span className="truncate">{lang?.creators_lyrics_mark || 'Отметить строку'}</span>
              </button>
              <button
                type="button"
                onClick={undoMark}
                disabled={timedCount === 0}
                aria-label={lang?.creators_lyrics_undo || 'Шаг назад'}
                title={lang?.creators_lyrics_undo || 'Шаг назад'}
                className={ICON_BUTTON}
              >
                <Icon name="IC-moveback" className="h-5 w-5 fill-current" />
              </button>
            </div>
            <div className="flex min-w-0 items-center gap-3 text-xs">
              <span className="shrink-0 text-zinc-500">{lang?.creators_lyrics_next || 'Строка:'}</span>
              <span className="min-w-0 flex-1 truncate text-zinc-200">{lines[cursor]?.text}</span>
              <span className="hidden shrink-0 text-zinc-500 xl:inline">
                {lang?.creators_lyrics_keys || 'Пробел — отметить · Backspace — назад · ← → — перемотка'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-white duration-300" style={{ width: `${(timedCount / lines.length) * 100}%` }} />
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {(lang?.creators_lyrics_progress || 'Отмечено {done} из {total}')
                .replace('{done}', String(timedCount))
                .replace('{total}', String(lines.length))}
            </span>
            <button type="button" onClick={resetTimes} disabled={timedCount === 0} className={cn(SMALL, 'shrink-0')}>
              {lang?.creators_lyrics_reset_times || 'Сбросить разметку'}
            </button>
          </div>

          <div className="flex flex-col rounded-3xl border border-zinc-600/30 p-3">
            {lines.map((line, index) => (
              <SyncRow
                key={index}
                isNow={index === nowIndex}
                isSelected={index === cursor}
                lang={lang}
                line={line}
                onClear={() => setLineTime(index, null)}
                onNudge={(delta) => nudge(index, delta)}
                onSeek={() => {
                  setCursor(index);
                  seekAndPlay(line.time as number);
                }}
                onSelect={() => setCursor(index)}
                onSetNow={() => setLineTime(index, Math.round(currentTime * 100) / 100)}
                rowRef={index === cursor ? selectedRowRef : undefined}
              />
            ))}
          </div>
        </div>

        <div className="sticky top-16 hidden h-[calc(100vh-6rem)] overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-900 lg:block">
          {timedCount > 0 ? preview : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-zinc-500">
              {lang?.creators_lyrics_preview_empty || 'Здесь появится текст так, как его увидят слушатели.'}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {transport ? <div className="rounded-3xl border border-zinc-600/30 p-3">{transport}</div> : null}
        <div className="h-[60vh] overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-900">{preview}</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Звук редактора без встроенных контролов: управление — Transport. */}
      {track?.src ? (
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          onPlay={() => {
            setPlaying(true);
            // Два трека сразу не играют: основной плеер ставим на паузу.
            if (isPulsePlaying) togglePulse();
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => {
            setDuration(event.currentTarget.duration);
            event.currentTarget.playbackRate = rate;
          }}
          className="hidden"
        />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl font-bold text-zinc-100">{lang?.creators_lyrics || 'Текст песни'}</h1>
          {track ? (
            <Link href={`/pulse/create/edit-track?id=${id}`} className="truncate text-sm text-zinc-400 duration-300 hover:text-zinc-200">
              {track.name} — {track.artist}
            </Link>
          ) : null}
        </div>
        {!loading ? (
          <button type="button" onClick={() => save()} disabled={busy !== null || isSavedState} className={cn(PILL, PILL_ACTIVE, 'shrink-0 shadow')}>
            <Icon name={busy === 'save' ? 'IC-loader' : 'IC-check'} className={cn('h-4 w-4 fill-current', busy === 'save' && 'animate-spin')} />
            {isSavedState ? (lang?.creators_lyrics_saved_state || 'Сохранено') : (lang?.creators_lyrics_save || 'Сохранить')}
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex w-full items-center justify-center p-6">
          <Icon name="IC-loader" className="inline h-8 w-8 animate-spin fill-zinc-500" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={CHIP}>{sourceLabel}</span>
            {saved?.lyrics ? (
              <span className={CHIP}>
                {saved.synced ? (lang?.creators_lyrics_synced || 'Синхронизирован') : (lang?.pulse_lyrics_unsynced || 'Текст без синхронизации')}
              </span>
            ) : null}
            {dirty ? (
              <span className="rounded-full border border-zinc-600/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
                {lang?.creators_lyrics_unsaved || 'Есть несохранённые изменения'}
              </span>
            ) : null}
            {source === 'author' ? (
              <button type="button" onClick={() => setConfirm('reset')} disabled={busy !== null} className={SMALL}>
                {lang?.creators_lyrics_reset_auto || 'Вернуть автопоиск'}
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={cn(PILL, 'min-w-0 px-3 text-xs sm:px-4 sm:text-sm', mode === tab.id ? PILL_ACTIVE : PILL_IDLE)}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          {body}
        </>
      )}

      <Modal isOpen={confirmText !== null} onClose={() => setConfirm(null)} title={confirmText?.title} width="sm">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-300">{confirmText?.body}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                if (confirm === 'draft') {
                  writeDraft(id, null);
                  setPendingText('');
                }
                setConfirm(null);
              }}
              className={cn(PILL, PILL_IDLE)}
            >
              {confirmText?.cancel || lang?.cancel || 'Отменить'}
            </button>
            <button type="button" onClick={runConfirm} className={cn(PILL, PILL_ACTIVE)}>
              {confirmText?.action}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
