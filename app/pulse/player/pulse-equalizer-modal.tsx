'use client';

import { PulseModal } from '../pulse-modal';

const EQ_BANDS = [60, 230, 910, 3600, 14000];

type PulseEqualizerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eqGains: number[];
  onGainChange: (index: number, gain: number) => void;
  onReset: () => void;
};

export function PulseEqualizerModal({
  isOpen,
  onClose,
  eqGains,
  onGainChange,
  onReset,
}: PulseEqualizerModalProps) {
  return (
    <PulseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Эквалайзер"
    >
      <div className="flex flex-col gap-4 py-4 px-2">
        <div className="flex justify-around items-center h-48 w-full">
          {EQ_BANDS.map((freq, index) => (
            <div key={freq} className="flex flex-col items-center justify-between h-full w-10">
              <span className="text-xs text-zinc-400 font-medium h-4">
                {eqGains[index] > 0 ? '+' : ''}{eqGains[index]}
              </span>
              <div className="flex-grow flex items-center justify-center w-full relative my-2">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={eqGains[index]}
                  onChange={(event) => onGainChange(index, Number(event.target.value))}
                  className="w-40 appearance-none h-1.5 rounded-full bg-zinc-800 accent-purple-500 absolute origin-center -rotate-90"
                />
              </div>
              <span className="text-xs text-zinc-400 font-medium h-4">
                {freq >= 1000 ? `${(freq / 1000).toFixed(1).replace('.0', '')}k` : freq}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onReset}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-zinc-300 duration-300 hover:bg-zinc-700 hover:text-white active:scale-95"
        >
          <span>Сбросить настройки</span>
        </button>
      </div>
    </PulseModal>
  );
}
