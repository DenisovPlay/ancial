"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { cache, PERSISTENT_KEYS, resolveKeyInfo, DEFAULT_CACHE_TTL, SETTING_KEY_CACHE_TTL } from '../../lib/cache';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../../components/modal';

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

  const [isTtlModalOpen, setIsTtlModalOpen] = useState(false);
  const [currentTtl, setCurrentTtl] = useState<number>(DEFAULT_CACHE_TTL);

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

  const [downloadedTracks, setDownloadedTracks] = useState<Array<{ id: string; title?: string; artist?: string; size: number; savedAt: number }>>([]);

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
      home: { label: lang?.category_home || 'Главная', color: '#71717a' }, // zinc
      apps: { label: lang?.category_apps || 'Игры (Zynt)', color: '#22c55e' }, // green
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
      general: lang?.subcategory_general || 'Общие данные',
      weather: lang?.subcategory_weather || 'Погода',
      currency: lang?.subcategory_currency || 'Курсы валют',
      artists: lang?.subcategory_artists || 'Артисты',
      from_pulse: lang?.subcategory_from_pulse || 'Из Pulse',
      listened: lang?.subcategory_listened || 'Прослушано',
      now_listen: lang?.subcategory_now_listen || 'Сейчас слушают',
      we_like: lang?.subcategory_we_like || 'Нам нравится',
      tracks: lang?.subcategory_tracks || 'Треки',
      favorites: lang?.subcategory_favorites || 'Избранное',
      playlists: lang?.subcategory_playlists || 'Плейлисты',
      artist_playlists: lang?.subcategory_artist_playlists || 'Плейлисты артистов',
      offline_audio: lang?.subcategory_offline_audio || 'Скачанные треки (офлайн)',
      lyrics: lang?.subcategory_lyrics || 'Тексты песен (лирика)',
      pwa_cache: lang?.subcategory_pwa_cache || 'Файлы сайта (офлайн-доступ)',
      images_cache: lang?.subcategory_images_cache || 'Изображения и обложки',
      notifications_list: lang?.subcategory_notifications_list || 'Список уведомлений',
      // Apps (Zynt)
      home: lang?.subcategory_apps_home || 'Главная страница',
      category: lang?.subcategory_apps_category || 'Игры по категориям',
      search: lang?.subcategory_apps_search || 'Результаты поиска',
    };
  }, [lang]);

  const loadCacheData = async () => {
    if (typeof window === 'undefined') return;

    let total = 0;
    const cats: typeof cacheData.categories = {};

    // Initialize default categories
    const defaultCategories: string[] = ['feed', 'chats', 'wallet', 'friends', 'groups', 'profile', 'pulse', 'notifications', 'apps', 'other'];
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

    // Загружаем и добавляем размер IndexedDB кэша аудио
    try {
      const audioTracks = await cache.audio.getDownloadedList();
      setDownloadedTracks(audioTracks);
      const audioSize = audioTracks.reduce((acc, t) => acc + t.size, 0);
      if (audioSize > 0) {
        if (!cats['pulse']) {
          cats['pulse'] = { size: 0, keys: [], subcategories: {} };
        }
        cats['pulse'].size += audioSize;
        cats['pulse'].subcategories['offline_audio'] = {
          size: audioSize,
          keys: ['__indexeddb_offline_audio__']
        };
        total += audioSize;
      } else {
        if (cats['pulse'] && cats['pulse'].subcategories['offline_audio']) {
          delete cats['pulse'].subcategories['offline_audio'];
        }
      }
    } catch (err) {
      console.error('Failed to load audio cache size', err);
    }

    // Загружаем и добавляем размер Cache Storage (Service Worker PWA & Images cache)
    try {
      let pwaSize = 0;
      let imagesSize = 0;
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await window.caches.keys();
        for (const cacheKey of cacheKeys) {
          const swCache = await window.caches.open(cacheKey);
          const requests = await swCache.keys();
          let currentSize = 0;
          for (const req of requests) {
            const res = await swCache.match(req);
            if (res) {
              const len = res.headers.get('content-length');
              if (len) {
                currentSize += parseInt(len, 10);
              } else {
                currentSize += 5120; // 5KB fallback
              }
            }
          }
          if (cacheKey === 'ancial-images-v1') {
            imagesSize += currentSize;
          } else if (
            cacheKey === 'ancial-static-v1' || cacheKey === 'ancial-pages-v1' ||
            cacheKey === 'ancial-static-v2' || cacheKey === 'ancial-pages-v2' ||
            cacheKey === 'ancial-api-v1'
          ) {
            pwaSize += currentSize;
          }
        }
      }

      if (pwaSize > 0) {
        if (!cats['other']) {
          cats['other'] = { size: 0, keys: [], subcategories: {} };
        }
        cats['other'].size += pwaSize;
        cats['other'].subcategories['pwa_cache'] = {
          size: pwaSize,
          keys: ['__sw_pwa_cache__']
        };
        total += pwaSize;
      } else {
        if (cats['other'] && cats['other'].subcategories['pwa_cache']) {
          delete cats['other'].subcategories['pwa_cache'];
        }
      }

      if (imagesSize > 0) {
        if (!cats['other']) {
          cats['other'] = { size: 0, keys: [], subcategories: {} };
        }
        cats['other'].size += imagesSize;
        cats['other'].subcategories['images_cache'] = {
          size: imagesSize,
          keys: ['__sw_images_cache__']
        };
        total += imagesSize;
      } else {
        if (cats['other'] && cats['other'].subcategories['images_cache']) {
          delete cats['other'].subcategories['images_cache'];
        }
      }
    } catch (err) {
      console.error('Failed to load Service Worker cache size', err);
    }

    setCacheData({ totalSize: total, categories: cats });

    try {
      const savedTtl = window.localStorage.getItem(SETTING_KEY_CACHE_TTL);
      if (savedTtl) {
        setCurrentTtl(parseInt(savedTtl, 10));
      }
    } catch { }
  };

  const handleSaveTtl = (ttl: number) => {
    setCurrentTtl(ttl);
    try {
      window.localStorage.setItem(SETTING_KEY_CACHE_TTL, ttl.toString());
    } catch { }
    setIsTtlModalOpen(false);
    showNote({ content: lang?.settings_saved || 'Настройки сохранены', type: 'success', time: 3 });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?backurl=/settings/cache');
      return;
    }
    void loadCacheData();
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
  const handleClear = async () => {
    const keysToDelete: string[] = [];
    let shouldClearAudio = false;
    let shouldClearPwa = false;
    let shouldClearImages = false;

    Object.keys(cacheData.categories).forEach((catId) => {
      const catData = cacheData.categories[catId];
      if (!catData) return;

      Object.keys(catData.subcategories).forEach((subId) => {
        if (selectedSubs.has(`${catId}:${subId}`)) {
          const keys = catData.subcategories[subId].keys;
          if (keys.includes('__indexeddb_offline_audio__')) {
            shouldClearAudio = true;
          }
          if (keys.includes('__sw_pwa_cache__')) {
            shouldClearPwa = true;
          }
          if (keys.includes('__sw_images_cache__')) {
            shouldClearImages = true;
          }
          keysToDelete.push(...keys.filter(k => k !== '__indexeddb_offline_audio__' && k !== '__sw_pwa_cache__' && k !== '__sw_images_cache__'));
        }
      });
    });

    if (keysToDelete.length === 0 && !shouldClearAudio && !shouldClearPwa && !shouldClearImages) return;

    keysToDelete.forEach((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch (err) {
        console.error('Failed to clear key', k, err);
      }
    });

    if (shouldClearAudio) {
      try {
        await cache.audio.clear();
      } catch (err) {
        console.error('Failed to clear IndexedDB audio cache', err);
      }
    }

    if (shouldClearPwa) {
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
        }
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }
      } catch (err) {
        console.error('Failed to clear Service Worker cache', err);
      }
    }

    if (shouldClearImages) {
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          await window.caches.delete('ancial-images-v1');
        }
      } catch (err) {
        console.error('Failed to clear Service Worker images cache', err);
      }
    }

    showNote({
      content: lang?.cache_cleared_success || 'Кэш успешно очищен',
      type: 'success',
      time: 5,
    });

    setSelectedCats(new Set());
    setSelectedSubs(new Set());
    void loadCacheData();
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
        <div className="w-full max-w-3xl flex items-center justify-between gap-3">
          <span onClick={() => router.push('/settings')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-3 cursor-pointer">
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href={`#IC-chevron-left`}></use>
            </svg>
            {lang?.cache_settings || 'Память'}
          </span>
          <button
            onClick={() => setIsTtlModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 duration-300 active:scale-95 cursor-pointer text-zinc-300 border border-zinc-600/30"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
            </svg>
          </button>
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
        <div className="w-full max-w-sm px-3 flex flex-row items-center gap-3">
          <button
            onClick={handleClear}
            disabled={selectedSize === 0}
            className={`h-[48px] grow border border-zinc-600/30 w-full h-12 rounded-3xl font-semibold text-white shadow-xl flex items-center justify-center gap-2 duration-300 active:scale-95 cursor-pointer ${selectedSize > 0
              ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none opacity-50'
              }`}
          >
            <span className={selectedSize > 0 ? 'text-xs' : 'text-md'}>{lang?.cache_clear_selected || 'Очистить выбранное'}</span>
            {selectedSize > 0 && (
              <span className="font-mono text-purple-200 text-sm">({formatSize(selectedSize)})</span>
            )}
          </button>

          {!Object.keys(cacheData.categories).every(catId => cacheData.categories[catId].size === 0) && (
            <button
              onClick={() => {
                const allCats = Object.keys(cacheData.categories).filter(catId => cacheData.categories[catId].size > 0);
                const areAllSelected = allCats.every(catId => selectedCats.has(catId));

                const nextCats = new Set<string>();
                const nextSubs = new Set<string>();

                if (!areAllSelected) {
                  allCats.forEach(catId => {
                    nextCats.add(catId);
                    Object.keys(cacheData.categories[catId].subcategories).forEach(subId => {
                      nextSubs.add(`${catId}:${subId}`);
                    });
                  });
                }

                setSelectedCats(nextCats);
                setSelectedSubs(nextSubs);
              }}
              className="h-[48px] text-sm text-purple-400 hover:text-purple-300 font-medium cursor-pointer active:scale-95 duration-300 px-3 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/30"
            >
              {Object.keys(cacheData.categories).filter(catId => cacheData.categories[catId].size > 0).every(catId => selectedCats.has(catId))
                ? (lang?.cache_deselect_all || 'Снять выделение')
                : (lang?.cache_select_all || 'Выбрать всё')}
            </button>
          )}

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
                  <AnimatePresence initial={false}>
                    {isExpanded && subKeys.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex flex-col border-t border-zinc-800/60 bg-zinc-950/40 divide-y divide-zinc-900/50 overflow-hidden"
                      >
                        {subKeys.map((subId) => {
                          const subLabel = (subcategoryMeta as any)[subId] || subId;
                          const subData = catData.subcategories[subId];
                          const isSubSelected = selectedSubs.has(`${catId}:${subId}`);
                          const isOfflineAudio = subId === 'offline_audio';

                          return (
                            <div key={subId} className="flex flex-col">
                              <div
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

                              {isOfflineAudio && downloadedTracks.length > 0 && (
                                <div className="flex flex-col pl-14 pr-3 pb-3 gap-2 bg-zinc-950/20 divide-y divide-zinc-900/30">
                                  {downloadedTracks.map((track) => {
                                    const trackTitle = track.title || `Трек #${track.id}`;
                                    const trackArtist = track.artist || 'Неизвестный исполнитель';
                                    return (
                                      <div key={track.id} className="flex items-center justify-between py-2 gap-3 text-sm">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-zinc-300 truncate font-medium">{trackTitle}</span>
                                          <span className="text-zinc-500 text-xs truncate">{trackArtist}</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="text-zinc-400 font-mono text-xs">{formatSize(track.size)}</span>
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                await cache.audio.remove(track.id);
                                                showNote({
                                                  content: `Трек «${trackTitle}» удален из кэша`,
                                                  type: 'success',
                                                  time: 3
                                                });
                                                void loadCacheData();
                                              } catch (err) {
                                                console.error('Failed to delete single track', err);
                                              }
                                            }}
                                            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-red-400 duration-300 active:scale-90 cursor-pointer"
                                            title="Удалить из устройства"
                                          >
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
        )}
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>

      <Modal isOpen={isTtlModalOpen} onClose={() => setIsTtlModalOpen(false)} title={lang?.cache_settings_ttl || 'Срок хранения кеша'}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">
            {lang?.cache_ttl_desc || 'Выберите, как долго приложение должно хранить данные в кеше.'}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            {[
              { value: 1 * 24 * 60 * 60 * 1000, label: lang?.cache_ttl_1d || '1 день' },
              { value: 3 * 24 * 60 * 60 * 1000, label: lang?.cache_ttl_3d || '3 дня' },
              { value: 7 * 24 * 60 * 60 * 1000, label: lang?.cache_ttl_7d || '7 дней' },
              { value: 14 * 24 * 60 * 60 * 1000, label: lang?.cache_ttl_14d || '14 дней' },
              { value: 30 * 24 * 60 * 60 * 1000, label: lang?.cache_ttl_30d || '30 дней' },
              { value: 0, label: lang?.cache_ttl_inf || 'Бессрочно' },
            ].map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSaveTtl(opt.value)}
                className={`p-3 rounded-3xl border cursor-pointer duration-300 active:scale-95 flex items-center justify-between ${currentTtl === opt.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/60'
                  }`}
              >
                <span className="text-white font-medium">{opt.label}</span>
                {currentTtl === opt.value && (
                  <svg className="w-5 h-5 fill-purple-500" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
