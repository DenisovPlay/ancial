'use client';

import { PulseModal } from '../pulse-modal';

const EQ_BANDS = [60, 230, 910, 3600, 14000];

type PulseEqualizerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eqGains: number[];
  onGainChange: (index: number, gain: number) => void;
  onReset: () => void;
  lang?: Record<string, string> | null;
};

function formatBandLabel(frequency: number) {
  if (frequency < 1000) return String(frequency);
  return `${(frequency / 1000).toFixed(1).replace('.0', '')}k`;
}

export function PulseEqualizerModal({
  isOpen,
  onClose,
  eqGains,
  onGainChange,
  onReset,
  lang,
}: PulseEqualizerModalProps) {
  const isFlat = eqGains.every((gain) => gain === 0);

  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.pulse_equalizer || 'Эквалайзер'}
    >
      <div className="flex w-full items-end justify-between gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800/40 p-3">
        {EQ_BANDS.map((frequency, index) => {
          const gain = eqGains[index] ?? 0;

          return (
            <div key={frequency} className="flex min-w-0 flex-1 flex-col items-center gap-3">
              <span className="text-xs font-medium tabular-nums text-zinc-400">
                {gain > 0 ? '+' : ''}{gain}
              </span>

              {/* Вертикальный слайдер: обёртка фиксированной высоты, вход повёрнут
                  и по ширине ровно равен ей — иначе ползунок вылезает за колонку. */}
              <div className="relative flex h-40 w-full items-center justify-center">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  aria-label={`${formatBandLabel(frequency)} Hz`}
                  value={gain}
                  onChange={(event) => onGainChange(index, Number(event.target.value))}
                  className="absolute h-1.5 w-40 origin-center -rotate-90 cursor-pointer appearance-none rounded-full bg-zinc-700 accent-purple-500"
                />
              </div>

              <span className="text-xs font-medium tabular-nums text-zinc-400">
                {formatBandLabel(frequency)}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onReset}
        disabled={isFlat}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-zinc-300 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-300 enabled:cursor-pointer"
      >
        {lang?.pulse_equalizer_reset || 'Сбросить настройки'}
      </button>
    </PulseModal>
  );
}
