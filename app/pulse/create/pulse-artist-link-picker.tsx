'use client';

import { useState } from 'react';

import { ActionIcon } from '../pulse-components';

export type PulseLinkableArtist = {
  id?: number | string;
  name?: string;
};

type PulseArtistLinkPickerProps = {
  artists: PulseLinkableArtist[];
  label: string;
  onChange: (ids: string[]) => void;
  placeholder: string;
  selectedIds: string[];
};

/** Необязательная привязка релиза к профилям артистов пользователя. Имена исполнителей вводятся отдельно. */
export function PulseArtistLinkPicker({ artists, label, onChange, placeholder, selectedIds }: PulseArtistLinkPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (artists.length === 0) return null;

  const selectedArtists = artists.filter((a) => selectedIds.includes(String(a.id)));

  return (
    <div className="col-span-1 sm:col-span-2 flex w-full flex-col relative" style={{ zIndex: 40 }}>
      <span className="z-20 pl-4 text-zinc-400">{label}</span>
      <div className="-mt-3 z-10 flex min-h-[48px] w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between pl-2 pr-2 cursor-pointer"
        >
          <div className="flex flex-wrap gap-1.5 py-1.5 items-center">
            {selectedArtists.length === 0 ? (
              <span className="text-zinc-500 text-sm">{placeholder}</span>
            ) : (
              selectedArtists.map((a) => (
                <span
                  key={a.id}
                  className="bg-zinc-700 border border-zinc-600/30 text-white text-xs px-3 py-1 rounded-full font-medium"
                >
                  {a.name}
                </span>
              ))
            )}
          </div>
          <ActionIcon
            className={`w-5 h-5 fill-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            name="IC-chevron-down"
          />
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-600/30 rounded-3xl shadow-2xl max-h-56 overflow-y-auto z-50 p-2 flex flex-col gap-1">
            {artists.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 rounded-full cursor-pointer text-zinc-200 text-sm duration-200"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(String(a.id))}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selectedIds, String(a.id)]);
                    else onChange(selectedIds.filter((aid) => aid !== String(a.id)));
                  }}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-500 text-white focus:ring-0 cursor-pointer"
                />
                <span>{a.name}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
