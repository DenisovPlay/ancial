'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useStickers, type StickerItem, type StickerScope } from '../hooks/use-stickers';

export interface UnifiedStickerPickerProps {
  scope?: StickerScope;
  onSelect: (shortcode: string, sticker: StickerItem) => void;
  className?: string;
}

function StickerImg({ sticker }: { sticker: StickerItem }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <span className="h-8 w-8 inline-flex items-center justify-center text-zinc-600 text-[9px] select-none">
        {sticker.code.slice(0, 4)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sticker.image_url_avif ?? sticker.image_url}
      alt={sticker.shortcode}
      title={sticker.shortcode}
      loading="lazy"
      draggable={false}
      className="h-8 w-8 object-contain pointer-events-none select-none"
      onError={() => setErr(true)}
    />
  );
}

export default function UnifiedStickerPicker({
  scope = 'all',
  onSelect,
  className = '',
}: UnifiedStickerPickerProps) {
  const { packs, loading, error, reload, recentStickers, pushRecent } = useStickers(scope);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const packRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleStickerClick = useCallback(
    (sticker: StickerItem) => {
      pushRecent(sticker);
      onSelect(sticker.shortcode, sticker);
    },
    [pushRecent, onSelect],
  );

  const q = searchQuery.trim().toLowerCase();

  const filteredRecent = useMemo(
    () => q ? recentStickers.filter((s) => s.code.toLowerCase().includes(q) || s.shortcode.toLowerCase().includes(q)) : recentStickers,
    [recentStickers, q],
  );

  const filteredPacks = useMemo(
    () => packs.map((pack) => ({
      ...pack,
      stickers: q
        ? pack.stickers.filter((s) => s.code.toLowerCase().includes(q) || s.shortcode.toLowerCase().includes(q))
        : pack.stickers,
    })),
    [packs, q],
  );

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current && scrollRef.current) {
      scrollRef.current.scrollTo({ top: ref.current.offsetTop - 42, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative ${className}`} style={{ height: '15rem' }}>

      {/* ── Pack tabs: absolute top + gradient ── */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 p-1.5 pb-3 bg-gradient-to-b from-black via-black/90 to-transparent">
        {recentStickers.length > 0 && (
          <button
            type="button"
            onClick={() => scrollTo(recentRef)}
            title="Недавние"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-900/60 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
          >
            <svg className="w-3.5 h-3.5 fill-zinc-300" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
            </svg>
          </button>
        )}
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => { const r = packRefs.current[pack.id]; if (r && scrollRef.current) scrollRef.current.scrollTo({ top: r.offsetTop - 42, behavior: 'smooth' }); }}
            title={pack.title}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-900/60 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pack.icon_url} alt={pack.title} loading="lazy" draggable={false} className="w-4 h-4 object-contain rounded-full" />
          </button>
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-[42px] pb-[48px] [scrollbar-width:thin]"
      >
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col h-full items-center justify-center gap-2 text-zinc-500 text-xs">
            <span>Не удалось загрузить</span>
            <button
              type="button"
              onClick={reload}
              className="border border-zinc-600/30 rounded-3xl px-3 py-1 hover:text-zinc-200 duration-300 cursor-pointer active:scale-95"
            >
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="px-1 flex flex-col gap-2 pb-1">
            {/* Recent section */}
            {filteredRecent.length > 0 && (
              <div ref={recentRef}>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider px-1 pb-0.5 select-none">Недавние</p>
                <div className="grid grid-cols-7 gap-0.5">
                  {filteredRecent.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleStickerClick(s)}
                      title={s.shortcode}
                      className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
                    >
                      <StickerImg sticker={s} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pack sections */}
            {filteredPacks.map((pack) =>
              pack.stickers.length === 0 && q ? null : (
                <div key={pack.id} ref={(el) => { packRefs.current[pack.id] = el; }}>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider px-1 pb-0.5 select-none">{pack.title}</p>
                  <div className="grid grid-cols-7 gap-0.5">
                    {pack.stickers.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleStickerClick(s)}
                        title={s.shortcode}
                        className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
                      >
                        <StickerImg sticker={s} />
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}

            {filteredRecent.length === 0 && filteredPacks.every((p) => p.stickers.length === 0) && (
              <div className="flex h-16 items-center justify-center text-xs text-zinc-500 select-none">
                {q ? 'Стикеры не найдены' : 'Пусто'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Search: absolute bottom + gradient ── */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-1.5 pt-3 bg-gradient-to-t from-black via-black/90 to-transparent">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          placeholder="Поиск стикеров"
          autoComplete="off"
          className="backdrop-blur-lg backdrop-saturate-200 h-9 w-full rounded-3xl border border-zinc-600/30 bg-zinc-950/80 px-3 text-sm text-white placeholder-zinc-500 outline-none duration-300 focus:border-zinc-500/50"
        />
      </div>
    </div>
  );
}
