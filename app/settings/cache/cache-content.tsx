"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { cache, PERSISTENT_KEYS, resolveKeyInfo } from '../../lib/cache';

// Helper for formatting sizes
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Donut Chart Component
const DonutChart = ({ segments }: { segments: { color: string; value: number }[] }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r; // ~251.327

  if (total === 0) {
    return (
      <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="#27272a" // zinc-800
          strokeWidth="6"
          fill="transparent"
        />
      </svg>
    );
  }

  let currentOffset = 0;
  return (
    <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={r}
        stroke="#18181b" // zinc-900
        strokeWidth="6"
        fill="transparent"
      />
      {segments.map((segment, index) => {
        if (segment.value === 0) return null;
        const percent = segment.value / total;
        const strokeLength = percent * c;
        const strokeOffset = -currentOffset;
        currentOffset += strokeLength;

        return (
          <circle
            key={index}
            cx="50"
            cy="50"
            r={r}
            stroke={segment.color}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={`${strokeLength} ${c}`}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-500 ease-out"
          />
        );
      })}
    </svg>
  );
};

export default function CacheSettingsPage() {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showNote } = useNotification();

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set()); // "category:subcategory"

  const [cacheData, setCacheData] = useState<{
    totalSize: number;
    categories: Record<
      string,
      {
        size: number;
        keys: string[];
        subcategories: Record<string, { size: number; keys: string[] }>;
      }
    >;
  }>({ totalSize: 0, categories: {} });

  // Map category ID to its visual properties & translations
  const categoryMeta = useMemo(() => {
    return {
      feed: { label: lang?.category_feed || 'Лента', color: '#3b82f6' }, // blue
      chats: { label: lang?.category_chats || 'Чаты', color: '#10b981' }, // emerald
      wallet: { label: lang?.category_wallet || 'Кошелёк', color: '#f59e0b' }, // amber
      friends: { label: lang?.category_friends || 'Друзья', color: '#ec4899' }, // pink
      groups: { label: lang?.category_groups || 'Сообщества', color: '#8b5cf6' }, // purple
      profile: { label: lang?.category_profile || 'Профиль', color: '#06b6d4' }, // cyan
      pulse: { label: lang?.category_pulse || 'Pulse', color: '#ef4444' }, // red
      notifications: { label: lang?.category_notifications || 'Уведомления', color: '#eab308' }, // yellow
      other: { label: lang?.category_other || 'Другое', color: '#71717a' }, // zinc/grey
    };
  }, [lang]);

  // Subcategory labels
  const subcategoryMeta = useMemo(() => {
    return {
      posts: lang?.subcategory_posts || 'Публикации',
      dialogs: lang?.subcategory_dialogs || 'Диалоги',
      messages: lang?.subcategory_messages || 'История сообщений',
      messages_hash: lang?.subcategory_messages_hash || 'Сообщения (хэш)',
      previews: lang?.subcategory_previews || 'Превью медиа',
      overview: lang?.subcategory_overview || 'Обзор',
      merchants: lang?.subcategory_merchants || 'Панель мерчанта',
      merchant_details: lang?.subcategory_merchant_details || 'Настройки мерчантов',
      accounts: lang?.subcategory_accounts || 'Счета',
      transactions: lang?.subcategory_transactions || 'Транзакции',
      history: lang?.subcategory_history || 'История',
      list: lang?.subcategory_friends_list || 'Список друзей',
      groups_list: lang?.subcategory_groups_list || 'Мои сообщества',
      profile_data: lang?.subcategory_profile_data || 'Данные профилей',
      artists: lang?.subcategory_artists || 'Артисты',
      from_pulse: lang?.subcategory_from_pulse || 'Из Pulse',
      listened: lang?.subcategory_listened || 'Прослушано',
      now_listen: lang?.subcategory_now_listen || 'Сейчас слушают',
      we_like: lang?.subcategory_we_like || 'Нам нравится',
      tracks: lang?.subcategory_tracks || 'Треки',
      favorites: lang?.subcategory_favorites || 'Избранное',
      playlists: lang?.subcategory_playlists || 'Плейлисты',
      artist_playlists: lang?.subcategory_artist_playlists || 'Плейлисты артистов',
      notifications_list: lang?.subcategory_notifications_list || 'Список уведомлений',
    };
  }, [lang]);

  const loadCacheData = () => {
    if (typeof window === 'undefined') return;

    let total = 0;
    const cats: typeof cacheData.categories = {};

    // Initialize default categories
    const defaultCategories: string[] = ['feed', 'chats', 'wallet', 'friends', 'groups', 'profile', 'pulse', 'notifications', 'other'];
    defaultCategories.forEach((c) => {
      cats[c] = { size: 0, keys: [], subcategories: {} };
    });

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;

      // Skip persistent keys that we don't want to clear
      if (PERSISTENT_KEYS.has(k)) continue;

      const raw = window.localStorage.getItem(k) || '';
      const size = k.length + raw.length;

      const info = resolveKeyInfo(k);
      const categoryId = info.category || 'other';

      // Map dynamic subcategories correctly
      let subcategoryId = info.subcategory || 'general';
      if (categoryId === 'friends' && subcategoryId === 'general') subcategoryId = 'list';
      if (categoryId === 'groups' && subcategoryId === 'list') subcategoryId = 'groups_list';
      if (categoryId === 'notifications' && subcategoryId === 'general') subcategoryId = 'notifications_list';

      if (!cats[categoryId]) {
        cats[categoryId] = { size: 0, keys: [], subcategories: {} };
      }

      cats[categoryId].size += size;
      cats[categoryId].keys.push(k);

      if (!cats[categoryId].subcategories[subcategoryId]) {
        cats[categoryId].subcategories[subcategoryId] = { size: 0, keys: [] };
      }
      cats[categoryId].subcategories[subcategoryId].size += size;
      cats[categoryId].subcategories[subcategoryId].keys.push(k);

      total += size;
    }

    setCacheData({ totalSize: total, categories: cats });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?backurl=/settings/cache');
      return;
    }
    loadCacheData();
  }, [authLoading, isAuthenticated]);

  // Toggle category expansion
  const toggleExpand = (catId: string) => {
    const next = new Set(expandedCats);
    if (next.has(catId)) {
      next.delete(catId);
    } else {
      next.add(catId);
    }
    setExpandedCats(next);
  };

  // Toggle category selection
  const toggleSelectCat = (catId: string) => {
    const nextCats = new Set(selectedCats);
    const nextSubs = new Set(selectedSubs);
    const catData = cacheData.categories[catId];

    if (!catData) return;

    if (nextCats.has(catId)) {
      nextCats.delete(catId);
      // Remove all its subcategories
      Object.keys(catData.subcategories).forEach((subId) => {
        nextSubs.delete(`${catId}:${subId}`);
      });
    } else {
      nextCats.add(catId);
      // Add all its subcategories
      Object.keys(catData.subcategories).forEach((subId) => {
        nextSubs.add(`${catId}:${subId}`);
      });
    }

    setSelectedCats(nextCats);
    setSelectedSubs(nextSubs);
  };

  // Toggle subcategory selection
  const toggleSelectSub = (catId: string, subId: string) => {
    const nextCats = new Set(selectedCats);
    const nextSubs = new Set(selectedSubs);
    const key = `${catId}:${subId}`;

    if (nextSubs.has(key)) {
      nextSubs.delete(key);
      nextCats.delete(catId);
    } else {
      nextSubs.add(key);
      // Check if all subcategories of this category are now selected
      const catData = cacheData.categories[catId];
      if (catData) {
        const allSubsSelected = Object.keys(catData.subcategories).every((sId) =>
          nextSubs.has(`${catId}:${sId}`)
        );
        if (allSubsSelected) {
          nextCats.add(catId);
        }
      }
    }

    setSelectedCats(nextCats);
    setSelectedSubs(nextSubs);
  };

  // Clear selected keys
  const handleClear = () => {
    const keysToDelete: string[] = [];

    Object.keys(cacheData.categories).forEach((catId) => {
      const catData = cacheData.categories[catId];
      if (!catData) return;

      Object.keys(catData.subcategories).forEach((subId) => {
        if (selectedSubs.has(`${catId}:${subId}`)) {
          keysToDelete.push(...catData.subcategories[subId].keys);
        }
      });
    });

    if (keysToDelete.length === 0) return;

    keysToDelete.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch (err) {
        console.error('Failed to clear key', k, err);
      }
    });

    showNote({
      content: lang?.cache_cleared_success || 'Кэш успешно очищен',
      type: 'success',
      time: 5,
    });

    setSelectedCats(new Set());
    setSelectedSubs(new Set());
    loadCacheData();
  };

  // Compute selected size
  const selectedSize = useMemo(() => {
    let size = 0;
    Object.keys(cacheData.categories).forEach((catId) => {
      const catData = cacheData.categories[catId];
      if (!catData) return;

      Object.keys(catData.subcategories).forEach((subId) => {
        if (selectedSubs.has(`${catId}:${subId}`)) {
          size += catData.subcategories[subId].size;
        }
      });
    });
    return size;
  }, [cacheData, selectedSubs]);

  // Construct chart segments
  const chartSegments = useMemo(() => {
    return Object.keys(cacheData.categories)
      .map((catId) => {
        const meta = (categoryMeta as any)[catId] || { color: '#71717a' };
        const val = cacheData.categories[catId]?.size || 0;
        return { color: meta.color, value: val };
      })
      .filter((s) => s.value > 0);
  }, [cacheData, categoryMeta]);

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-purple-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent" style={{ zIndex: 99 }}>
        <div className="w-full max-w-3xl flex items-center gap-3">
          <span onClick={() => router.push('/settings')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-3 cursor-pointer">
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href={`#IC-chevron-left`}></use>
            </svg>
            {lang?.cache_settings || 'Память'}
          </span>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="flex flex-col items-center justify-center gap-3 w-full max-w-3xl">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <DonutChart segments={chartSegments} />
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-white leading-none">{formatSize(cacheData.totalSize)}</span>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mt-1">{lang?.cache_usage || 'Использование памяти'}</span>
          </div>
        </div>

        {/* Clear Button - placed under the circle, visible always */}
        <div className="w-full max-w-sm px-3 flex flex-col gap-3">
          <button
            onClick={handleClear}
            disabled={selectedSize === 0}
            className={`border border-zinc-600/30 w-full h-12 rounded-3xl font-semibold text-white shadow-xl flex items-center justify-center gap-2 duration-300 active:scale-95 cursor-pointer ${selectedSize > 0
              ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none opacity-50'
              }`}
          >
            <span>{lang?.cache_clear_selected || 'Очистить выбранное'}</span>
            {selectedSize > 0 && (
              <span className="font-mono text-purple-200">({formatSize(selectedSize)})</span>
            )}
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        {Object.keys(cacheData.categories).every(catId => cacheData.categories[catId].size === 0) ? (
          <div className="text-zinc-500 text-center py-10">
            {lang?.cache_empty || 'Кэш пуст'}
          </div>
        ) : (
          Object.keys(cacheData.categories)
            .filter((catId) => cacheData.categories[catId].size > 0)
            .map((catId) => {
              const meta = (categoryMeta as any)[catId] || { label: catId, color: '#71717a' };
              const catData = cacheData.categories[catId];
              const isExpanded = expandedCats.has(catId);
              const isSelected = selectedCats.has(catId);
              const subKeys = Object.keys(catData.subcategories).filter(subId => catData.subcategories[subId].size > 0);

              return (
                <div key={catId} className="flex flex-col bg-zinc-900/60 rounded-3xl border border-zinc-800/80 overflow-hidden transition-all duration-300">
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 gap-3 select-none hover:bg-zinc-800/40 duration-300">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Checkbox merged with colored circle */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectCat(catId);
                        }}
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95"
                        style={{
                          borderColor: meta.color,
                          backgroundColor: isSelected ? meta.color : 'transparent'
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 fill-black" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </div>

                      {/* Expandable trigger (label + space + size + chevron) */}
                      <div
                        onClick={() => toggleExpand(catId)}
                        className="flex-1 flex items-center justify-between cursor-pointer"
                      >
                        <span className="text-white font-medium text-lg">{meta.label}</span>

                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400 font-mono text-sm">{formatSize(catData.size)}</span>
                          {subKeys.length > 0 && (
                            <div className="p-1 hover:bg-zinc-800/50 rounded-full duration-300">
                              <svg
                                className={`w-6 h-6 fill-zinc-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 48 48"
                              >
                                <use href="#IC-chevron-down"></use>
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories Accordion Panel */}
                  {isExpanded && subKeys.length > 0 && (
                    <div className="flex flex-col border-t border-zinc-800/60 bg-zinc-950/40 divide-y divide-zinc-900/50">
                      {subKeys.map((subId) => {
                        const subLabel = (subcategoryMeta as any)[subId] || subId;
                        const subData = catData.subcategories[subId];
                        const isSubSelected = selectedSubs.has(`${catId}:${subId}`);

                        return (
                          <div
                            key={subId}
                            onClick={() => toggleSelectSub(catId, subId)}
                            className="flex items-center justify-between p-3 pl-9 gap-3 hover:bg-zinc-900/30 duration-300 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              {/* Subcategory checkbox merged with dot outline */}
                              <div
                                className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-95"
                                style={{
                                  borderColor: meta.color,
                                  backgroundColor: isSubSelected ? meta.color : 'transparent'
                                }}
                              >
                                {isSubSelected && (
                                  <svg className="w-2.5 h-2.5 fill-black" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-zinc-300 text-sm">{subLabel}</span>
                            </div>
                            <span className="text-zinc-500 font-mono text-xs">{formatSize(subData.size)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
