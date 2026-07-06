/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import {
  cn,
  getCachedSevenTvSearchItems,
  getSevenTvStickerCacheKey,
  Icon,
  type SevenTvSticker,
  searchSevenTvStickers,
  SEVEN_TV_MIN_QUERY_LENGTH,
  SEVEN_TV_SEARCH_DEBOUNCE_MS,
  STICKER_NAMES,
  normalizeText,
} from '../lib/messages-shared';

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
  const [tab, setTab] = useState<'native' | '7tv'>('native');
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<{
    error: string;
    items: SevenTvSticker[];
    key: string;
  } | null>(null);
  const [loadingKey, setLoadingKey] = useState('');
  const searchVersionRef = useRef(0);

  const normalizedQuery = normalizeText(searchInput);
  const effectiveQuery = normalizedQuery === ''
    ? ''
    : normalizedQuery.length >= SEVEN_TV_MIN_QUERY_LENGTH
      ? normalizedQuery
      : null;
  const searchCacheKey = effectiveQuery === null
    ? ''
    : `${getSevenTvStickerCacheKey(effectiveQuery)}:0:24`;
  const cachedResults = searchCacheKey ? getCachedSevenTvSearchItems(searchCacheKey) : null;
  const visibleResults = cachedResults ?? (searchState?.key === searchCacheKey ? searchState.items : []);
  const visibleError = searchState?.key === searchCacheKey ? searchState.error : '';
  const isSevenTvLoading = Boolean(
    isOpen
    && tab === '7tv'
    && searchCacheKey
    && loadingKey === searchCacheKey
    && cachedResults === null,
  );

  useEffect(() => {
    if (!isOpen || tab !== '7tv' || effectiveQuery === null || !searchCacheKey || cachedResults !== null) {
      return undefined;
    }

    const requestId = searchVersionRef.current + 1;
    searchVersionRef.current = requestId;
    const abortController = new AbortController();

    const timeoutId = window.setTimeout(() => {
      setLoadingKey(searchCacheKey);

      void searchSevenTvStickers(effectiveQuery, {
        signal: abortController.signal,
      })
        .then((items) => {
          if (searchVersionRef.current !== requestId) return;
          setSearchState({
            error: '',
            items,
            key: searchCacheKey,
          });
          setLoadingKey((currentKey) => (currentKey === searchCacheKey ? '' : currentKey));
        })
        .catch((error) => {
          if (searchVersionRef.current !== requestId) return;
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          console.error('Failed to search 7TV stickers', error);
          setSearchState({
            error: '7TV временно недоступен',
            items: [],
            key: searchCacheKey,
          });
          setLoadingKey((currentKey) => (currentKey === searchCacheKey ? '' : currentKey));
        });
    }, SEVEN_TV_SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [cachedResults, effectiveQuery, isOpen, searchCacheKey, tab]);

  return (
    <div className="flex w-[17rem] flex-col relative">
      <div className="flex gap-1.5 p-1.5 pb-0 absolute inset-x-0 top-0 bg-gradient-to-b from-black via-black/90 to-transparent">
        <button
          type="button"
          onClick={() => {
            setTab('native');
          }}
          className={cn(
            'cursor-pointer backdrop-blur-lg backdrop-saturate-200  flex-1 rounded-3xl border border-zinc-600/30 px-3 py-2 text-sm font-medium duration-300 active:scale-95',
            tab === 'native'
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          )}
        >
          Стикеры
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('7tv');
          }}
          className={cn(
            'flex items-center justify-center cursor-pointer backdrop-blur-lg backdrop-saturate-200  flex-1 rounded-3xl border border-zinc-600/30 px-3 py-2 text-sm font-medium duration-300 active:scale-95',
            tab === '7tv'
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          )}
        >
          <img src="/img/branding/7tv.svg?id=-1" alt="7TV" className="h-5 w-5" />
        </button>
      </div>

      {tab === 'native' ? (
        <div className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto overflow-x-hidden p-1.5 pt-[54px]">
          {STICKER_NAMES.map((stickerName) => (
            <button
              key={stickerName}
              type="button"
              onClick={() => {
                onSendNativeSticker(stickerName);
              }}
              disabled={isSending}
              className="cursor-pointer shrink-0 h-16 w-16 overflow-hidden hover:rounded-2xl duration-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              <img
                src={`/includes/img/anlite/stickers/webp/${stickerName}.webp?id=NEW`}
                alt={stickerName}
                className="h-16 w-16 object-contain"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="max-h-72 flex flex-col items-center overflow-y-auto overflow-x-hidden px-1.5 pt-[54px] pb-[58px]">
            {isSevenTvLoading ? (
              <div className="flex h-52 w-62 items-center justify-center">
                <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-300" />
              </div>
            ) : visibleError ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                {visibleError}
              </div>
            ) : visibleResults.length ? (
              <div className="grid grid-cols-4 gap-1.5">
                {visibleResults.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => {
                      onSendSevenTvSticker(sticker);
                    }}
                    disabled={isSending}
                    className="cursor-pointer shrink-0 h-16 w-16 overflow-hidden hover:rounded-2xl duration-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                    title={sticker.name}
                  >
                    <Image
                      src={sticker.url}
                      alt={sticker.name}
                      unoptimized
                      width={64}
                      height={64}
                      className="h-16 w-16 object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : normalizedQuery && normalizedQuery.length < SEVEN_TV_MIN_QUERY_LENGTH ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                {lang?.enter_min_chars?.replace('{min}', String(SEVEN_TV_MIN_QUERY_LENGTH)) || `Введите минимум ${SEVEN_TV_MIN_QUERY_LENGTH} символа`}
              </div>
            ) : normalizedQuery ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                {lang?.nothing_found || 'Ничего не найдено'}
              </div>
            ) : (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-500">
                {lang?.popular_7tv_stickers || 'Популярные стикеры 7TV'}
              </div>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-1.5 pt-0">
            <div className="relative">
              <input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                  }
                }}
                placeholder={lang?.search_7tv || "Поиск 7TV"}
                autoComplete="off"
                className="backdrop-blur-lg backdrop-saturate-200 h-10 w-full rounded-3xl border border-zinc-600/30 bg-zinc-950/80 px-3 text-sm text-white placeholder-zinc-500 outline-none duration-300 focus:border-zinc-500/50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
