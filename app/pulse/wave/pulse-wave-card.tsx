'use client';

import { useEffect, useRef, useState } from 'react';

import Icon from '../../components/svg-icon';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { cn } from '../../lib/cn';
import PulseWaveSettingsModal from './pulse-wave-settings-modal';
import { saveWavePrefs, usePulseWavePrefs } from './use-pulse-wave';
import { summarizeWave, type PulseWavePrefs } from './wave-utils';
import WaveBackdrop from './wave-backdrop';
import { waveFont } from './wave-font';

/** Блок ВЕЙВ на главной Pulse: живые волны, название, «играть» и настройки. Только для вошедших. */
export default function PulseWaveCard() {
  const { isAuthenticated, lang } = useAuth();
  const { showNote } = useNotification();
  const { wave } = usePulseWavePrefs();
  const { currentCollectionId, currentTrackObj, isPlaying, startWave, togglePlay } = usePulsePlayer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Волны двигаются, только пока блок на экране.
  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const label = (prefs: PulseWavePrefs) => summarizeWave(prefs, (group, id) => {
    if (group === 'mood') return lang?.[`pulse_mood_${id}`] || id;
    if (group === 'lang') return lang?.[`pulse_wave_lang_${id}`] || id;
    return lang?.[`pulse_wave_character_${id}`] || id;
  });
  // Строка с настройками — только когда они заданы; по умолчанию блок без лишнего текста.
  const summary = label(wave);
  const isActive = currentCollectionId === 'wave';
  const isWavePlaying = isActive && isPlaying;

  const start = async (prefs: PulseWavePrefs) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const ok = await startWave(label(prefs));
      if (!ok) showNote({ content: lang?.pulse_wave_empty || 'Не нашли треков под такие настройки', type: 'info', time: 5 });
    } finally {
      setIsStarting(false);
    }
  };

  const handleSave = async (next: PulseWavePrefs) => {
    setIsSettingsOpen(false);
    try {
      const saved = await saveWavePrefs(next);
      // Вейв уже играет — перезапускаем с новыми настройками.
      if (isActive) await start(saved);
    } catch {
      showNote({ content: lang?.errorhappend || 'Произошла ошибка', type: 'error', time: 4 });
    }
  };

  return (
    <>
      <div className="w-full max-w-screen-2xl px-3 lg:px-0">
        <div
          ref={cardRef}
          className="relative isolate flex min-h-36 items-center gap-3 overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-950 p-3 sm:min-h-48"
        >
          <WaveBackdrop
            live={isVisible}
            playing={isWavePlaying}
            mood={isActive ? currentTrackObj?.mood ?? undefined : undefined}
            genre={isActive ? currentTrackObj?.genre ?? undefined : undefined}
            trackKey={isActive ? String(currentTrackObj?.sid ?? '') : ''}
          />

          <button
            type="button"
            aria-label={lang?.pulse_wave_play || 'Включить'}
            onClick={() => (isActive ? togglePlay() : void start(wave))}
            className="relative z-10 flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-lg duration-300 hover:scale-105 active:scale-95 sm:h-20 sm:w-20"
          >
            {isStarting ? (
              <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-black" />
            ) : (
              <Icon name={isWavePlaying ? 'IC-pause-solid' : 'IC-play-solid'} className="h-8 w-8 fill-black sm:h-10 sm:w-10" />
            )}
          </button>

          <div className="relative z-10 flex min-w-0 flex-grow flex-col">
            <h2 className={cn(waveFont.className, 'text-6xl font-black uppercase italic leading-[0.85] tracking-tight text-white sm:text-8xl')}>
              {lang?.pulse_wave || 'Вейв'}
            </h2>
            {summary ? <span className="mt-1.5 truncate text-xs uppercase tracking-widest text-zinc-300/80">{summary}</span> : null}
          </div>

          <button
            type="button"
            aria-label={lang?.pulse_wave_settings || 'Настроить'}
            data-tip={lang?.pulse_wave_settings || 'Настроить'}
            onClick={() => setIsSettingsOpen(true)}
            className="glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.35] [--glass-blur:10px] relative z-10 flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 duration-300 hover:[--glass-alpha:0.55] active:scale-95"
          >
            <Icon name="IC-settings" className="h-6 w-6 fill-white" />
          </button>
        </div>
      </div>
      <PulseWaveSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSave={(next) => void handleSave(next)} value={wave} />
    </>
  );
}
