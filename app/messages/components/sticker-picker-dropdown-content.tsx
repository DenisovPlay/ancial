/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useStickers, type StickerItem } from '../../hooks/use-stickers';
import {
  cn,
  getCachedSevenTvSearchItems,
  getSevenTvStickerCacheKey,
  Icon,
  type SevenTvSticker,
  searchSevenTvStickers,
  SEVEN_TV_MIN_QUERY_LENGTH,
  SEVEN_TV_SEARCH_DEBOUNCE_MS,
  normalizeText,
} from '../lib/messages-shared';

function StickerBtn({ sticker, onClick, disabled }: { sticker: StickerItem; onClick: () => void; disabled?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={sticker.shortcode}
      className="flex items-center justify-center shrink-0 h-14 w-14 overflow-hidden hover:rounded-2xl duration-300 hover:bg-zinc-900 disabled:opacity-50 cursor-pointer active:scale-95"
    >
      {err ? (
        <span className="text-zinc-600 text-[9px]">{sticker.code.slice(0, 4)}</span>
      ) : (
        <img
          src={sticker.image_url_avif ?? sticker.image_url}
          alt={sticker.shortcode}
          loading="lazy"
          draggable={false}
          className="h-14 w-14 object-contain pointer-events-none select-none"
          onError={() => setErr(true)}
        />
      )}
    </button>
  );
}

export default function StickerPickerDropdownContent({
  isOpen,
  isSending,
  onSendNativeSticker,
  onSendSevenTvSticker,
}: {
  isOpen: boolean;
  isSending: boolean;
  onSendNativeSticker: (stickerName: string) => void;
  onSendSevenTvSticker: (sticker: SevenTvSticker) => void;
}) {
  const { lang } = useAuth();
  const { packs, loading: packsLoading, recentStickers, pushRecent } = useStickers('messages');

  const [activeTab, setActiveTab] = useState<'native' | '7tv'>('native');
  const [searchText, setSearchText] = useState('');

  // Reset search when switching tabs
  const switchTab = (tab: 'native' | '7tv') => {
    setActiveTab(tab);
    setSearchText('');
  };

  // ── Native ───────────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const packRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleNativeSelect = useCallback(
    (sticker: StickerItem) => {
      pushRecent(sticker);
      onSendNativeSticker(sticker.shortcode.replace(/^:|:$/g, ''));
    },
    [pushRecent, onSendNativeSticker],
  );

  const scrollToRef = (el: HTMLDivElement | null) => {
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 46, behavior: 'smooth' });
    }
  };

  const q = activeTab === 'native' ? searchText.trim().toLowerCase() : '';
  const filteredRecent = useMemo(
    () => q ? recentStickers.filter((s) => s.code.toLowerCase().includes(q) || s.shortcode.toLowerCase().includes(q)) : recentStickers,
    [recentStickers, q],
  );
  const filteredPacks = useMemo(
    () => packs.map((p) => ({
      ...p,
      stickers: q ? p.stickers.filter((s) => s.code.toLowerCase().includes(q) || s.shortcode.toLowerCase().includes(q)) : p.stickers,
    })),
    [packs, q],
  );

  // ── 7TV ──────────────────────────────────────────────────────────────────────
  const [searchState, setSearchState] = useState<{ error: string; items: SevenTvSticker[]; key: string } | null>(null);
  const [loadingKey, setLoadingKey] = useState('');
  const searchVersionRef = useRef(0);

  const normalizedQuery = normalizeText(activeTab === '7tv' ? searchText : '');
  const effectiveQuery = normalizedQuery === '' ? '' : normalizedQuery.length >= SEVEN_TV_MIN_QUERY_LENGTH ? normalizedQuery : null;
  const searchCacheKey = effectiveQuery === null ? '' : `${getSevenTvStickerCacheKey(effectiveQuery)}:0:24`;
  const cachedResults = searchCacheKey ? getCachedSevenTvSearchItems(searchCacheKey) : null;
  const visibleResults = cachedResults ?? (searchState?.key === searchCacheKey ? searchState.items : []);
  const visibleError = searchState?.key === searchCacheKey ? searchState.error : '';
  const isSevenTvLoading = Boolean(isOpen && activeTab === '7tv' && searchCacheKey && loadingKey === searchCacheKey && cachedResults === null);

  useEffect(() => {
    if (!isOpen || activeTab !== '7tv' || effectiveQuery === null || !searchCacheKey || cachedResults !== null) return undefined;
    const requestId = searchVersionRef.current + 1;
    searchVersionRef.current = requestId;
    const abort = new AbortController();
    const tid = window.setTimeout(() => {
      setLoadingKey(searchCacheKey);
      void searchSevenTvStickers(effectiveQuery, { signal: abort.signal })
        .then((items) => {
          if (searchVersionRef.current !== requestId) return;
          setSearchState({ error: '', items, key: searchCacheKey });
          setLoadingKey((k) => (k === searchCacheKey ? '' : k));
        })
        .catch((err) => {
          if (searchVersionRef.current !== requestId) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setSearchState({ error: '7TV временно недоступен', items: [], key: searchCacheKey });
          setLoadingKey((k) => (k === searchCacheKey ? '' : k));
        });
    }, SEVEN_TV_SEARCH_DEBOUNCE_MS);
    return () => { abort.abort(); window.clearTimeout(tid); };
  }, [cachedResults, effectiveQuery, isOpen, searchCacheKey, activeTab]);

  return (
    <div className="relative w-[17rem]" style={{ height: '21rem' }}>

      {/* ── Tab bar: absolute top + gradient ── */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1 p-1.5 pb-3 bg-gradient-to-b from-black via-black/90 to-transparent">
        {/* Recent */}
        {recentStickers.length > 0 && (
          <button
            type="button"
            onClick={() => { if (activeTab !== 'native') setActiveTab('native'); setTimeout(() => scrollToRef(recentRef.current), 0); }}
            title={lang?.recent_stickers || 'Недавние'}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-900/60 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-zinc-300" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
            </svg>
          </button>
        )}
        {/* Pack icons */}
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => { if (activeTab !== 'native') setActiveTab('native'); setTimeout(() => scrollToRef(packRefs.current[pack.id]), 0); }}
            title={pack.title}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-3xl border border-zinc-600/30 bg-zinc-900/60 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95"
          >
            <img src={pack.icon_url} alt={pack.title} loading="lazy" draggable={false} className="w-5 h-5 object-contain rounded-full" />
          </button>
        ))}

        <div className="flex-1" />

        {/* 7TV tab button — always visible */}
        <button
          type="button"
          onClick={() => switchTab(activeTab === '7tv' ? 'native' : '7tv')}
          title="7TV"
          className={cn(
            'flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-3xl border duration-300 cursor-pointer active:scale-95',
            activeTab === '7tv'
              ? 'border-zinc-500 bg-zinc-700/80'
              : 'border-zinc-600/30 bg-zinc-900/60 hover:bg-zinc-800',
          )}
        >
          <img src="/img/branding/7tv.svg?id=-1" alt="7TV" className="h-5 w-5" />
        </button>
      </div>

      {/* ── Native content: single scroll with sections ── */}
      {activeTab === 'native' && (
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-[46px] pb-[50px] [scrollbar-width:thin]"
        >
          {packsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
            </div>
          ) : (
            <div className="px-1.5 flex flex-col gap-3 pb-1">
              {filteredRecent.length > 0 && (
                <div ref={recentRef}>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider px-1 pb-1 select-none">
                    {lang?.recent_stickers || 'Недавние'}
                  </p>
                  <div className="grid grid-cols-4 gap-1">
                    {filteredRecent.map((s) => (
                      <StickerBtn key={s.code} sticker={s} disabled={isSending} onClick={() => handleNativeSelect(s)} />
                    ))}
                  </div>
                </div>
              )}
              {filteredPacks.map((pack) =>
                pack.stickers.length === 0 && q ? null : (
                  <div key={pack.id} ref={(el) => { packRefs.current[pack.id] = el; }}>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider px-1 pb-1 select-none">{pack.title}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {pack.stickers.map((s) => (
                        <StickerBtn key={s.code} sticker={s} disabled={isSending} onClick={() => handleNativeSelect(s)} />
                      ))}
                    </div>
                  </div>
                ),
              )}
              {filteredRecent.length === 0 && filteredPacks.every((p) => p.stickers.length === 0) && (
                <div className="flex h-24 items-center justify-center text-xs text-zinc-500 select-none">
                  {q ? (lang?.stickers_not_found || 'Не найдено') : 'Пусто'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 7TV content ── */}
      {activeTab === '7tv' && (
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pt-[46px] pb-[50px] px-1.5 [scrollbar-width:thin]">
          {isSevenTvLoading ? (
            <div className="flex h-full items-center justify-center">
              <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-300" />
            </div>
          ) : visibleError ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400 text-center px-2">{visibleError}</div>
          ) : visibleResults.length > 0 ? (
            <div className="grid grid-cols-4 gap-1">
              {visibleResults.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => onSendSevenTvSticker(sticker)}
                  disabled={isSending}
                  title={sticker.name}
                  className="flex items-center justify-center shrink-0 h-14 w-14 overflow-hidden hover:rounded-2xl duration-300 hover:bg-zinc-900 disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  <Image src={sticker.url} alt={sticker.name} unoptimized width={64} height={64} className="h-14 w-14 object-contain" />
                </button>
              ))}
            </div>
          ) : normalizedQuery && normalizedQuery.length < SEVEN_TV_MIN_QUERY_LENGTH ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400 text-center px-2">
              {lang?.enter_min_chars?.replace('{min}', String(SEVEN_TV_MIN_QUERY_LENGTH)) || `Минимум ${SEVEN_TV_MIN_QUERY_LENGTH} символа`}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500 text-center px-2">
              {normalizedQuery ? (lang?.nothing_found || 'Ничего не найдено') : (lang?.popular_7tv_stickers || 'Популярные стикеры 7TV')}
            </div>
          )}
        </div>
      )}

      {/* ── Search: absolute bottom + gradient ── */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-1.5 pt-3 bg-gradient-to-t from-black via-black/90 to-transparent">
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          placeholder={activeTab === '7tv' ? (lang?.search_7tv || 'Поиск 7TV') : (lang?.search_stickers || 'Поиск стикеров')}
          autoComplete="off"
          className="backdrop-blur-lg backdrop-saturate-200 h-10 w-full rounded-3xl border border-zinc-600/30 bg-zinc-950/80 px-3 text-sm text-white placeholder-zinc-500 outline-none duration-300 focus:border-zinc-500/50"
        />
      </div>
    </div>
  );
}
