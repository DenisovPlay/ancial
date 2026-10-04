'use client';

import { useEffect, useMemo, useState } from 'react';

import Icon from '../../components/svg-icon';
import Modal from '../../components/modal';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI } from '../../lib/api-v2';
import { PULSE_GENRES, PULSE_MOODS } from '../pulse-constants';
import WaveBackdrop from './wave-backdrop';
import { waveFont } from './wave-font';
import WaveGlyph from './wave-glyph';
import {
  DEFAULT_WAVE,
  WAVE_CHARACTERS,
  WAVE_LANGS,
  WAVE_PRESETS,
  applyWavePreset,
  isDefaultWave,
  toggleInList,
  toggleWaveLang,
  withMoods,
  type PulseWavePrefs,
} from './wave-utils';

interface WaveOptions {
  genres?: Record<string, number>;
  moods?: Record<string, number>;
}

/** Цвета: полный класс на каждый вариант (Tailwind собирает только литералы). on — выбрано, off — спокойный оттенок. */
const TONE = {
  amber: { on: 'bg-amber-400 text-black border-transparent', off: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  emerald: { on: 'bg-emerald-400 text-black border-transparent', off: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  red: { on: 'bg-red-400 text-black border-transparent', off: 'bg-red-500/15 text-red-300 border-red-500/30' },
  sky: { on: 'bg-sky-400 text-black border-transparent', off: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  orange: { on: 'bg-orange-400 text-black border-transparent', off: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  indigo: { on: 'bg-indigo-400 text-black border-transparent', off: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  blue: { on: 'bg-blue-400 text-black border-transparent', off: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  yellow: { on: 'bg-yellow-300 text-black border-transparent', off: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  teal: { on: 'bg-teal-400 text-black border-transparent', off: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  rose: { on: 'bg-rose-400 text-black border-transparent', off: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  zinc: { on: 'bg-zinc-200 text-black border-transparent', off: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  cyan: { on: 'bg-cyan-400 text-black border-transparent', off: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  fuchsia: { on: 'bg-fuchsia-400 text-black border-transparent', off: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  stone: { on: 'bg-stone-300 text-black border-transparent', off: 'bg-stone-500/15 text-stone-300 border-stone-500/30' },
  purple: { on: 'bg-purple-400 text-black border-transparent', off: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
} as const;
type Tone = keyof typeof TONE;

const PRESET_TONE: Record<string, Tone> = { morning: 'amber', commute: 'emerald', workout: 'red', focus: 'sky', evening: 'orange', night: 'indigo' };
const MOOD_TONE: Record<string, Tone> = {
  happy: 'amber', sad: 'blue', funny: 'orange', energetic: 'yellow', calm: 'teal', romantic: 'rose',
  dark: 'zinc', aggressive: 'red', dreamy: 'indigo', chill: 'cyan', sexy: 'fuchsia', scary: 'stone',
};

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{children}</h3>;
}

/** Плитка вайба: иконка и подпись в цвете настроения. */
function VibeTile({ active, glyph, label, onClick, tone }: { active: boolean; glyph: string; label: string; onClick: () => void; tone: Tone }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-3xl border p-3 duration-300 active:scale-95',
        active ? TONE[tone].on : TONE[tone].off,
      )}
    >
      <WaveGlyph name={glyph} className="h-7 w-7" />
      <span className="text-xs font-medium leading-tight">{label}</span>
    </button>
  );
}

function Pill({ active, children, icon, onClick }: { active: boolean; children: React.ReactNode; icon?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium duration-300 active:scale-95',
        active ? 'border-transparent bg-white text-black' : 'border-zinc-600/30 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700',
      )}
    >
      {icon ? <WaveGlyph name={icon} className="h-5 w-5" /> : null}
      {children}
    </button>
  );
}

/** Настройки ВЕЙВа: когда, вайб, жанры, язык, характер. Правки применяются по «Готово». */
export default function PulseWaveSettingsModal({
  isOpen,
  onClose,
  onSave,
  value,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (next: PulseWavePrefs) => void;
  value: PulseWavePrefs;
}) {
  const { lang } = useAuth();
  const [draft, setDraft] = useState<PulseWavePrefs>(value);
  const [options, setOptions] = useState<WaveOptions | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Окно открылось — работаем с копией текущих настроек, правки применяются только по «Готово».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
    let cancelled = false;
    void AncialAPI.pulseGetWaveOptions<WaveOptions>()
      .then((result) => { if (!cancelled) setOptions(result ?? {}); })
      .catch(() => { if (!cancelled) setOptions({}); });
    return () => { cancelled = true; };
  }, [isOpen, value]);

  // Фильтруем по каталогу, только если сервер вернул данные; не ответил или пусто — показываем весь словарь,
  // иначе разделы остались бы пустыми.
  const hasOptions = Object.keys(options?.genres ?? {}).length > 0 || Object.keys(options?.moods ?? {}).length > 0;
  const genreList = useMemo(() => {
    const counts = options?.genres ?? {};
    return PULSE_GENRES.filter((genre) => !hasOptions || (counts[genre] ?? 0) > 0 || draft.genres.includes(genre));
  }, [draft.genres, hasOptions, options?.genres]);
  const moodList = useMemo(() => {
    const counts = options?.moods ?? {};
    return PULSE_MOODS.filter((mood) => !hasOptions || (counts[mood.id] ?? 0) > 0 || draft.moods.includes(mood.id));
  }, [draft.moods, hasOptions, options?.moods]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang?.pulse_wave || 'Вейв'} showHeader={false} width="md" swipeable={false}>
      <div className="flex flex-col">
        {/* Шапка и низ закреплены; к содержимому они переходят через затемнение (как в окне комментариев), без резкого края. */}
        <div data-live="true" className="wave-backdrop sticky top-0 z-20 isolate flex items-center justify-between p-3">
          <div className="absolute inset-0 overflow-hidden">
            <WaveBackdrop />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-zinc-900 to-transparent" />
          <h2 className={cn(waveFont.className, 'relative z-10 text-6xl font-black uppercase italic leading-[0.85] tracking-tight text-white sm:text-7xl')}>
            {lang?.pulse_wave || 'Вейв'}
          </h2>
          <button
            type="button"
            aria-label={lang?.close || 'Закрыть'}
            onClick={onClose}
            className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.35] [--glass-blur:10px] relative z-10 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 duration-300 hover:[--glass-alpha:0.55] active:scale-95"
          >
            <Icon name="IC-times" className="h-6 w-6 fill-white" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-3">
          <section className="flex flex-col gap-3">
            <Label>{lang?.pulse_wave_when || 'Когда'}</Label>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {Object.keys(WAVE_PRESETS).map((preset) => (
                <VibeTile
                  key={preset}
                  active={draft.preset === preset}
                  glyph={preset}
                  label={lang?.[`pulse_wave_preset_${preset}`] || preset}
                  tone={PRESET_TONE[preset]}
                  onClick={() => setDraft((d) => applyWavePreset(d, preset))}
                />
              ))}
            </div>
          </section>

          {moodList.length > 0 ? (
            <section className="flex flex-col gap-3">
              <Label>{lang?.pulse_mood_label || 'Настроение'}</Label>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {moodList.map((mood) => (
                  <VibeTile
                    key={mood.id}
                    active={draft.moods.includes(mood.id)}
                    glyph={mood.id}
                    label={lang?.[mood.labelKey] || mood.id}
                    tone={MOOD_TONE[mood.id] ?? 'purple'}
                    onClick={() => setDraft((d) => withMoods(d, toggleInList(d.moods, mood.id)))}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {genreList.length > 0 ? (
          <section className="flex flex-col gap-3">
            <Label>{lang?.pulse_wave_genres || 'Жанры'}</Label>
            <div className="flex flex-wrap gap-3">
              {genreList.map((genre) => (
                <Pill key={genre} active={draft.genres.includes(genre)} onClick={() => setDraft((d) => ({ ...d, genres: toggleInList(d.genres, genre) }))}>
                  {genre}
                </Pill>
              ))}
            </div>
          </section>
          ) : null}

          <section className="flex flex-col gap-3">
            <Label>{lang?.pulse_wave_language || 'Язык'}</Label>
            <div className="flex flex-wrap gap-3">
              {WAVE_LANGS.map((id) => (
                <Pill
                  key={id}
                  active={id === 'any' ? draft.langs.length === 0 : draft.langs.includes(id)}
                  icon={id === 'any' || id === 'instrumental' ? id : undefined}
                  onClick={() => setDraft((d) => ({ ...d, langs: toggleWaveLang(d.langs, id) }))}
                >
                  {lang?.[`pulse_wave_lang_${id}`] || id}
                </Pill>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <Label>{lang?.pulse_wave_character || 'Характер'}</Label>
            <div className="grid grid-cols-3 gap-3">
              {WAVE_CHARACTERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={draft.character === id}
                  onClick={() => setDraft((d) => ({ ...d, character: id }))}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium duration-300 active:scale-95',
                    draft.character === id ? 'border-transparent bg-white text-black' : 'border-zinc-600/30 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700',
                  )}
                >
                  <WaveGlyph name={id} className="h-5 w-5 shrink-0" />
                  <span className="truncate">{lang?.[`pulse_wave_character_${id}`] || id}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-20 flex gap-3 bg-gradient-to-t from-zinc-900 via-zinc-900/90 to-transparent p-3 pt-12">
          <button
            type="button"
            aria-label={lang?.pulse_wave_reset || 'Сбросить'}
            data-tip={lang?.pulse_wave_reset || 'Сбросить'}
            disabled={isDefaultWave(draft)}
            onClick={() => setDraft({ ...DEFAULT_WAVE })}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-800 duration-300 hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="IC-repeat" className="h-6 w-6 fill-white" />
          </button>
          {/* Мата-переключателя в окне больше нет: ограничение по explicit не используется, при сохранении снимается. */}
          <button
            type="button"
            onClick={() => onSave({ ...draft, explicit: true })}
            className="h-12 flex-grow cursor-pointer rounded-full bg-white px-4 text-base font-semibold text-black duration-300 hover:bg-zinc-200 active:scale-95"
          >
            {lang?.pulse_wave_done || 'Готово'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
