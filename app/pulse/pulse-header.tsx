'use client';

import React, { useState } from 'react';
import { ActionIcon, PulseLogo, cn } from './pulse-components';

export function PulseHeader({
  isAuthenticated,
  lang,
  onLogoClick,
  onOpenMyPulse,
  onSubmitSearch,
  searchValue,
  setSearchValue,
  placeholder,
  hideSearchOnMobile,
  hideProfileOnMobile,
  centerLogoOnMobile,
}: {
  isAuthenticated: boolean;
  lang?: Record<string, string> | null;
  onLogoClick: () => void;
  onOpenMyPulse: () => void;
  onSubmitSearch: (event: React.FormEvent<HTMLFormElement>) => void;
  searchValue: string;
  setSearchValue: (val: string) => void;
  placeholder?: string;
  hideSearchOnMobile?: boolean;
  hideProfileOnMobile?: boolean;
  centerLogoOnMobile?: boolean;
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div
      className="sticky top-0 flex min-h-[60px] w-full max-w-screen-2xl items-center justify-between bg-gradient-to-b from-black via-black/90 to-transparent px-3 pt-3 lg:px-0"
      style={{ zIndex: 1300 }}
    >
      <button
        type="button"
        onClick={onLogoClick}
        className={cn(
          'shrink-0 overflow-hidden duration-300 active:scale-95',
          isSearchFocused ? 'w-0 opacity-0 scale-95' : 'w-32 sm:w-48 opacity-100 scale-100',
          centerLogoOnMobile && "absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:left-auto"
        )}
        aria-label="Pulse home"
      >
        <PulseLogo className="w-32 sm:w-48 hover:opacity-80 duration-300 cursor-pointer" />
      </button>

      <form
        onSubmit={onSubmitSearch}
        className={cn(
          "ml-3 mr-3 h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 backdrop-blur-md backdrop-saturate-200",
          hideSearchOnMobile ? "hidden md:flex" : "flex"
        )}
        style={{ zIndex: 11 }}
      >
        <input
          value={searchValue}
          onBlur={() => setIsSearchFocused(false)}
          onChange={(event) => setSearchValue(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          className="w-full bg-transparent pl-2 text-white placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
          placeholder={placeholder || lang?.pulse_search || 'Поиск по Pulse'}
          autoComplete="off"
        />
        <button className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 active:scale-95" type="submit">
          <ActionIcon className="h-8 w-8 cursor-pointer" name="IC-search" />
        </button>
      </form>

      {isAuthenticated ? (
        <button
          type="button"
          onClick={onOpenMyPulse}
          className={cn(
            "h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900/20 backdrop-blur-md backdrop-saturate-200 duration-300 hover:bg-zinc-700 active:scale-95 ml-auto",
            hideProfileOnMobile ? "hidden md:flex" : "flex"
          )}
          aria-label="My Pulse"
        >
          <ActionIcon className="h-8 w-8" name="IC-me" />
        </button>
      ) : null}
    </div>
  );
}
