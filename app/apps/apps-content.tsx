'use client';

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { useDragScroll } from '../hooks/useDragScroll';
import {
  type LegacyAppSummary,
  type LegacyAppsResponse,
  toAppId,
  toBooleanFlag,
} from './apps-model';
import { AncialAPI } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import AppInfoModal from './app-info-modal';
import {
  CategoryIcon,
  SearchIcon,
  SpinnerIcon,
  StarIcon,
  UserIcon,
} from './apps-icons';

type AppsMode = 'home' | 'search' | 'category';

type AppsContentProps = {
  category?: string;
  initialQuery?: string;
  mode: AppsMode;
};

type CategoryItem = {
  animationClass?: string;
  href: string;
  icon: string;
  key: string;
  labelFallback: string;
  langKey: string;
};

const categories: CategoryItem[] = [
  {
    animationClass: 'mancard',
    href: 'Приключения',
    icon: 'adventure',
    key: 'adventure',
    labelFallback: 'Приключения',
    langKey: 'adventure',
  },
  {
    animationClass: 'shovelcard',
    href: 'Песочницы',
    icon: 'sandbox',
    key: 'sandbox',
    labelFallback: 'Песочницы',
    langKey: 'sandbox',
  },
  {
    animationClass: 'carcard',
    href: 'Гонки',
    icon: 'racing',
    key: 'racing',
    labelFallback: 'Гонки',
    langKey: 'racing',
  },
  {
    animationClass: 'retrocard',
    href: 'Аркады',
    icon: 'arcade',
    key: 'arcade',
    labelFallback: 'Аркады',
    langKey: 'arcade',
  },
  {
    href: 'Ролевые',
    icon: 'roleplay',
    key: 'roleplay',
    labelFallback: 'Ролевые',
    langKey: 'roleplay',
  },
  {
    href: 'Классика',
    icon: 'classic',
    key: 'classic',
    labelFallback: 'Классика',
    langKey: 'classic',
  },
  {
    href: 'Социальные',
    icon: 'social',
    key: 'social',
    labelFallback: 'Социальные',
    langKey: 'social',
  },
];

export default function AppsContent({ category, initialQuery = '', mode }: AppsContentProps) {
  const router = useRouter();
  const { lang } = useAuth();
  const categoryScrollRef = useDragScroll({ speed: 1.4 });
  const [apps, setApps] = useState<LegacyAppSummary[]>([]);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalAppId, setModalAppId] = useState<number | string | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const loadApps = useCallback(async () => {
    // Формируем ключ кэша в зависимости от режима
    const cacheKey =
      mode === 'search'
        ? `apps_cache_search_${initialQuery}`
        : mode === 'category' && category
          ? `apps_cache_category_${category}`
          : 'apps_cache_home';

    const subcategoryId: 'home' | 'category' | 'search' =
      mode === 'search' ? 'search' : mode === 'category' ? 'category' : 'home';

    // Немедленно показываем данные из кэша (Stale-While-Revalidate)
    const cachedApps = cache.get<{ apps?: { id: unknown; name?: string; desk?: string; cover?: string; red_chois?: unknown }[] }>(cacheKey, { category: 'apps', subcategory: subcategoryId });
    if (cachedApps?.apps && cachedApps.apps.length > 0) {
      setApps(cachedApps.apps as typeof apps);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      let data: { apps?: LegacyAppSummary[] };
      if (mode === 'search') {
        data = await AncialAPI.searchApps<{ apps?: LegacyAppSummary[] }>(initialQuery);
      } else if (mode === 'category' && category) {
        data = await AncialAPI.getAppsCategory<{ apps?: LegacyAppSummary[] }>(category);
      } else {
        data = await AncialAPI.getAppsHomePage<{ apps?: LegacyAppSummary[] }>();
      }

      const freshApps = data.apps ?? [];
      setApps(freshApps);

      // Сохраняем свежие данные в кэш
      if (freshApps.length > 0) {
        cache.set(cacheKey, data, { category: 'apps', subcategory: subcategoryId });
      }
    } catch (caughtError) {
      // Если кэш уже показан — не обнуляем список, просто убираем спиннер
      if (!cachedApps?.apps?.length) {
        setError(caughtError instanceof Error ? caughtError.message : (lang?.loading_error || 'Ошибка загрузки'));
        setApps([]);
      }
    } finally {
      setLoading(false);
    }
  }, [category, initialQuery, mode]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/apps/search?q=${encodeURIComponent(query.trim())}`);
  };

  const heading = useMemo(() => {
    if (mode === 'category' && category) {
      return category;
    }

    if (mode === 'search') {
      return query ? `${lang?.search ?? 'Поиск'}: ${query}` : lang?.appssearchplaceholder ?? 'Поиск';
    }

    return lang?.popular ?? 'Популярное';
  }, [category, lang, mode, query]);

  return (
    <div className="flex flex-col jusitify-center items-center gap-3 pb-64 duration-300">
      <div
        className="w-full max-w-screen-2xl flex items-center px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent"
        style={{ zIndex: 99 }}
      >
        <button
          aria-label="Zynt"
          className={`shrink-0 overflow-hidden duration-300 active:scale-95 ${focused ? 'w-0 opacity-0 scale-95' : 'mr-3 w-28 opacity-100 scale-100'}`}
          onClick={() => router.push('/apps')}
          type="button"
        >
          <img alt="Zynt" className="w-28 hover:opacity-80 duration-300 cursor-pointer" src="/img/logos/zynt.svg" />
        </button>
        <form
          className="flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12"
          onSubmit={handleSearch}
          style={{ zIndex: 11 }}
        >
          <input
            autoComplete="off"
            className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
            id="SC_INP"
            onBlur={() => setFocused(false)}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={lang?.appssearchplaceholder ?? 'Найти игру'}
            value={query}
          />
          <button className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700" type="submit">
            <SearchIcon className="inline w-8 h-8 fill-white" />
          </button>
        </form>
        <button
          className="ml-3 cursor-pointer shrink-0 h-12 w-12 flex items-center justify-center bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 active:scale-95 duration-300 rounded-full"
          onClick={() => router.push('/settings/account')}
          type="button"
        >
          <UserIcon className="inline w-8 h-8 fill-white" />
        </button>
      </div>

      <div ref={categoryScrollRef} className="overflow-auto flex lg:rounded-box viewport dragscroll w-full px-3 lg:px-0 max-w-screen-2xl">
        <div className="flex flex-row flex-nowrap gap-3 accounts-content justify-center items-center">
          {categories.map((item) => (
            <button
              className={`${item.animationClass ?? ''} bg-zinc-900/20 border border-zinc-600/30 rounded-3xl p-1.5 flex flex-col gap-0.5 cursor-pointer duration-300 w-36 h-24 overflow-hidden justify-center items-center shadow group active:scale-95 shrink-0`}
              key={item.key}
              onClick={() => router.push(`/apps/category/${encodeURIComponent(item.href)}`)}
              type="button"
            >
              <div className="flex justify-center items-center">
                <div className="border border-zinc-600/30 fill-purple-500 bg-purple-500/25 flex justify-center items-center rounded-full p-1.5 w-14 h-14 shadow group-hover:w-44 group-hover:h-44 duration-500">
                  <CategoryIcon
                    className={`${categoryAnimationIconClass(item.key)} w-12 h-12 group-hover:h-16 group-hover:w-16 duration-300`}
                    name={item.icon}
                  />
                </div>
              </div>
              <span className="text-lg font-bold text-content-700 max-w-32 truncate">
                {lang?.[item.langKey] ?? item.labelFallback}
              </span>
            </button>
          ))}
        </div>
      </div>

      <span className="text-2xl lg:text-3xl xl:text-4xl w-full max-w-screen-2xl font-black px-3 lg:px-0">
        {heading}
      </span>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full px-3 lg:px-0 max-w-screen-2xl">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="border border-zinc-600/30 bg-zinc-900/20 w-full rounded-3xl overflow-hidden relative aspect-square animate-pulse"
            >
              <div className="w-full h-full bg-zinc-800"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center w-full max-w-screen-2xl flex flex-col gap-0.5 justify-center items-center py-20 px-3">
          <img alt="" className="h-56" src="/includes/img/stickers/sponge.gif" />
          <span className="text-lg text-center text-zinc-200">{lang?.connection_lost || 'Связь потеряна!'}</span>
          <span className="text-content-600">{lang?.try_refresh || 'Попробуйте обновить страницу'}</span>
          <span className="text-xs text-zinc-400">{error}</span>
        </div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div className="text-center w-full max-w-screen-2xl flex flex-col gap-0.5 justify-center items-center py-20 px-3">
          <img alt="" className="h-56" src="/includes/img/anlite/nothingfound.webp" />
          <span className="text-base text-zinc-100 w-full text-center font-black">
            {lang?.emptycomments ?? 'Ничего не найдено'}
          </span>
          <span className="text-sm text-zinc-300 w-full text-center font-medium">
            {lang?.emptymessagesdesc ?? 'Попробуйте изменить запрос'}
          </span>
        </div>
      )}

      {!loading && !error && apps.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full px-3 lg:px-0 max-w-screen-2xl">
          {apps.map((app) => (
            <button
              className="group border border-zinc-600/30 bg-zinc-900/20 hover:bg-zinc-900 w-full rounded-3xl overflow-hidden hover:-translate-y-1 active:scale-95 duration-300 cursor-pointer relative text-left"
              key={String(app.id)}
              onClick={() => setModalAppId(toAppId(app.id))}
              type="button"
            >
              <img alt={app.name} className="rounded-3xl w-full" src={app.cover} />
              <div className="bg-zinc-900/50 group-hover:backdrop-blur-md w-full h-full absolute top-0 left-0 opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 duration-300 rounded-3xl flex flex-col">
                <span className="text-2xl text-white font-bold pt-3 pl-3 shrink-0 pr-8 break-words">
                  {app.name}
                </span>
                <div className="h-full flex p-3 overflow-hidden relative rounded-3xl">
                  <span className="text-lg text-zinc-200">{app.desk}</span>
                  <div className="w-full h-full absolute top-0 left-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900 rounded-3xl" />
                </div>
                {toBooleanFlag(app.red_chois) && (
                  <div className="absolute top-1 right-1 bg-zinc-700 rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <StarIcon className="w-5 h-5 fill-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <AppInfoModal
        appId={modalAppId}
        isOpen={modalAppId !== null}
        onClose={() => setModalAppId(null)}
      />
    </div>
  );
}

function categoryAnimationIconClass(key: string) {
  switch (key) {
    case 'adventure':
      return 'mananim';
    case 'sandbox':
      return 'shovelanim';
    case 'racing':
      return 'caranim';
    case 'arcade':
      return 'retroanim';
    default:
      return '';
  }
}
