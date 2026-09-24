'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AppImage from '../../components/app-image';
import { getDropdownMotionProps } from '../../components/navigation';
import Icon from '../../components/svg-icon';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI } from '../../lib/api-v2';
import { useAppearanceMotion } from '../../lib/use-appearance';

export type PulseLinkableArtist = {
  id?: number | string;
  name?: string;
  img?: string;
  verify?: number | string;
};

type PulseArtistLinkPickerProps = {
  artists: PulseLinkableArtist[];
  className?: string;
  label: string;
  onChange: (ids: string[]) => void;
  placeholder: string;
  selectedIds: string[];
};

type ArtistsSearchApiResponse = {
  artists?: PulseLinkableArtist[] | null;
};

type SingleArtistApiResponse = {
  artist?: PulseLinkableArtist | null;
};

/** Полноценный селект привязки треков/альбомов к профилям артистов с поиском и аватарками */
export function PulseArtistLinkPicker({
  artists,
  className,
  label,
  onChange,
  placeholder,
  selectedIds,
}: PulseArtistLinkPickerProps) {
  const { lang } = useAuth();
  // Та же анимация, что у Dropdown, и та же зависимость от «Интерфейс → Анимации → меню».
  const menuMotion = useAppearanceMotion().menu;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PulseLinkableArtist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fetchedArtistMap, setFetchedArtistMap] = useState<Record<string, PulseLinkableArtist>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Объединенная карта известных артистов (входные + поиск + подгруженные)
  const allArtistMap = useMemo(() => {
    const map: Record<string, PulseLinkableArtist> = { ...fetchedArtistMap };
    for (const a of artists) {
      if (a.id !== undefined && a.id !== null) {
        map[String(a.id)] = a;
      }
    }
    for (const a of searchResults) {
      if (a.id !== undefined && a.id !== null) {
        map[String(a.id)] = a;
      }
    }
    return map;
  }, [artists, searchResults, fetchedArtistMap]);

  // Подгружаем метаданные выбранных артистов, если их нет в карте
  useEffect(() => {
    for (const idStr of selectedIds) {
      if (idStr && !allArtistMap[idStr]) {
        AncialAPI.pulseGetArtist<SingleArtistApiResponse>(idStr)
          .then((res) => {
            const artistData = res?.artist || (res as unknown as PulseLinkableArtist);
            if (artistData && artistData.name) {
              setFetchedArtistMap((prev) => ({
                ...prev,
                [idStr]: {
                  id: idStr,
                  name: artistData.name,
                  img: artistData.img,
                  verify: artistData.verify,
                },
              }));
            }
          })
          .catch(() => {
            // Игнорируем ошибку загрузки отдельного профиля
          });
      }
    }
  }, [selectedIds, allArtistMap]);

  // Поиск через API с дебаунсом
  const performSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    AncialAPI.pulseSearch<ArtistsSearchApiResponse>(trimmed, 'artists')
      .then((res) => {
        const found = Array.isArray(res?.artists) ? res.artists : [];
        setSearchResults(found);
      })
      .catch(() => {
        setSearchResults([]);
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(val);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Список отображаемых артистов в дропдауне
  const displayedArtists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const seenIds = new Set<string>();
    const list: PulseLinkableArtist[] = [];

    const addArtist = (a: PulseLinkableArtist) => {
      const aId = String(a.id);
      if (!seenIds.has(aId)) {
        seenIds.add(aId);
        list.push(a);
      }
    };

    // 1. Сначала результаты поиска по API
    for (const a of searchResults) {
      if (a.id !== undefined && a.id !== null) addArtist(a);
    }

    // 2. Локальные артисты пользователя
    for (const a of artists) {
      if (a.id === undefined || a.id === null) continue;
      if (!query || (a.name || '').toLowerCase().includes(query)) {
        addArtist(a);
      }
    }

    // 3. Выбранные ранее артисты (если подходят под поиск или поиск пуст)
    for (const idStr of selectedIds) {
      const a = allArtistMap[idStr];
      if (a && (!query || (a.name || '').toLowerCase().includes(query))) {
        addArtist(a);
      }
    }

    return list;
  }, [artists, allArtistMap, searchQuery, searchResults, selectedIds]);

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleOpen = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  const toggleArtist = (idStr: string) => {
    if (selectedIds.includes(idStr)) {
      onChange(selectedIds.filter((aid) => aid !== idStr));
    } else {
      onChange([...selectedIds, idStr]);
    }
  };

  const removeArtist = (idStr: string, e: MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter((aid) => aid !== idStr));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div
      className={`col-span-1 sm:col-span-2 flex w-full flex-col relative -mt-3 ${className || ''}`}
      style={{ zIndex: isOpen ? 50 : 30 }}
      onKeyDown={handleKeyDown}
    >
      <span className="z-20 pl-4 text-zinc-400">{label}</span>

      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className={`-mt-3 z-10 flex min-h-[48px] w-full items-center justify-between rounded-full border border-zinc-600/30 bg-zinc-800/90 px-3 py-1.5 duration-300 cursor-pointer transition-colors ${
          isOpen ? 'border-zinc-500 bg-zinc-800' : 'hover:border-zinc-500/50'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 py-0.5">
          {selectedIds.length === 0 ? (
            <span className="text-zinc-500 text-sm pl-1 select-none">{placeholder}</span>
          ) : (
            selectedIds.map((idStr) => {
              const artistInfo = allArtistMap[idStr] || artists.find((a) => String(a.id) === idStr);
              const artistName = artistInfo?.name || `ID: ${idStr}`;
              const artistImg = artistInfo?.img || '/img/pulse/artist.png';

              return (
                <span
                  key={idStr}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700/80 border border-zinc-600/30 pl-1 pr-2.5 py-1 text-xs text-white font-medium shadow-xs"
                >
                  <AppImage
                    width={20}
                    height={20}
                    fallbackSrc="/img/pulse/artist.png"
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                    src={artistImg}
                    alt={artistName}
                  />
                  <span className="truncate max-w-[130px]">{artistName}</span>
                  <button
                    type="button"
                    onClick={(e) => removeArtist(idStr, e)}
                    className="text-zinc-400 hover:text-white transition-colors duration-300 p-0.5 rounded-full cursor-pointer active:scale-95"
                    aria-label={`Удалить ${artistName}`}
                  >
                    <Icon name="IC-times" className="w-3.5 h-3.5 fill-current" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        <div className="flex items-center pl-2 shrink-0">
          <Icon
            name="IC-chevron-down"
            className={`w-5 h-5 fill-zinc-400 shrink-0 transition-transform duration-300 ${
              isOpen ? 'rotate-180 fill-white' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-40" onClick={handleClose} />}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...getDropdownMotionProps(menuMotion)}
            className="absolute left-0 right-0 top-full z-50 mt-3 flex origin-top flex-col overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-900 shadow-2xl"
          >
            {/* Поле поиска артистов: список уходит под него с плавным затуханием */}
            <div className="relative z-10 w-full bg-gradient-to-b from-zinc-900 from-70% to-transparent p-3">
              <div className="relative w-full">
                <Icon
                  name="IC-search"
                  className="w-4 h-4 fill-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={lang?.creators_search_artists || 'Поиск по артистам...'}
                  className="w-full h-10 pl-9 pr-9 rounded-full bg-zinc-800/80 border border-zinc-600/30 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-400 duration-300"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {isSearching ? (
                    <Icon name="IC-loader" className="w-4 h-4 fill-zinc-400 animate-spin" />
                  ) : searchQuery.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="text-zinc-400 hover:text-white transition-colors duration-300 p-0.5 rounded-full cursor-pointer active:scale-95"
                      aria-label="Очистить поиск"
                    >
                      <Icon name="IC-times" className="w-4 h-4 fill-current" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Список артистов: строки во всю ширину, фон обрезается скруглением блока */}
            <div role="listbox" className="-mt-3 flex max-h-60 flex-col overflow-y-auto pb-3 pt-3">
              {displayedArtists.length === 0 ? (
                <div className="py-6 px-3 text-center text-sm text-zinc-500">
                  {isSearching
                    ? (lang?.creators_saving || 'Поиск...')
                    : (lang?.creators_nothing_found || lang?.nothing_found || 'Ничего не найдено')}
                </div>
              ) : (
                displayedArtists.map((a) => {
                  const aId = String(a.id);
                  const isSelected = selectedIds.includes(aId);
                  return (
                    <div
                      key={aId}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => toggleArtist(aId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleArtist(aId);
                        }
                      }}
                      className={`flex shrink-0 items-center justify-between gap-3 px-3 py-2 cursor-pointer duration-300 transition-colors focus:outline-none focus-visible:bg-zinc-800/60 ${
                        isSelected ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/60 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <AppImage
                          width={36}
                          height={36}
                          fallbackSrc="/img/pulse/artist.png"
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-600/30"
                          src={a.img || '/img/pulse/artist.png'}
                          alt={a.name || 'Artist avatar'}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{a.name}</span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 duration-300 border ${
                          isSelected
                            ? 'bg-white border-white text-black'
                            : 'bg-zinc-800/50 border-zinc-600/40 text-transparent'
                        }`}
                      >
                        <Icon name="IC-check" className={`w-3.5 h-3.5 ${isSelected ? 'fill-black' : 'opacity-0'}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
