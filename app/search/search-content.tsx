'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import AppImage from '../components/app-image';
import ErrorState from '../components/error-state';
import ImageViewerModal from '../components/image-viewer-modal';
import SearchBox from '../components/search-box';
import Icon from '../components/svg-icon';
import { useAuth } from '../context/AuthContext';
import { useDragScroll } from '../hooks/useDragScroll';
import { useLoadMoreObserver } from '../hooks/use-load-more-observer';
import { AncialAPI } from '../lib/api-v2';
import { cn } from '../lib/cn';
import { openExternalUrl } from '../lib/native-browser';
import { IS_NATIVE_APP } from '../lib/platform';
import { classifySearchInput, parseSearchTab, searchHref, SEARCH_TABS, type SearchTab } from '../lib/search-query';
import type { SearchApp, SearchGroup, SearchImageResult, SearchInfobox, SearchUser, SearchWebResult } from '../lib/search-types';
import SearchMusic, { type MusicBundle } from './search-music';
import {
  AppTile,
  GroupRow,
  GroupTile,
  ImageGrid,
  InfoboxCard,
  PersonRow,
  PersonTile,
  ResultSkeleton,
  SearchRail,
  SearchSection,
  WebResult,
} from './search-parts';

interface Bundle {
  apps: SearchApp[];
  groups: SearchGroup[];
  hasMore: boolean;
  images: SearchImageResult[];
  infobox: SearchInfobox | null;
  key: string;
  page: number;
  failed: boolean;
  users: SearchUser[];
  web: SearchWebResult[];
  /** Веб-поиск не ответил (все инстансы SearXNG недоступны) — не то же самое, что «ничего не найдено». */
  webDown: boolean;
}

const emptyBundle = (key: string): Bundle => ({ apps: [], failed: false, groups: [], hasMore: false, images: [], infobox: null, key, page: 1, users: [], web: [], webDown: false });

function mergeBy<T>(current: T[], incoming: T[], keyOf: (item: T) => string): T[] {
  const known = new Set(current.map(keyOf));
  return [...current, ...incoming.filter((item) => !known.has(keyOf(item)))];
}

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, langCode } = useAuth();
  const query = (searchParams.get('q') || '').trim();
  const tab = parseSearchTab(searchParams.get('tab'));
  const key = `${tab}|${query}`;

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [music, setMusic] = useState<(MusicBundle & { query: string }) | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const tabsRef = useDragScroll({ speed: 2 });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);

  // Первая страница выдачи. «Интернет» берёт и виджеты сайта (люди, сообщества, приложения) одним запросом.
  useEffect(() => {
    if (!query || tab === 'music') return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const type = tab === 'web' ? 'all' : tab;
        const res = await AncialAPI.search({ lang: langCode || 'ru', q: query, type });
        if (cancelled) return;
        setBundle({
          apps: res.apps ?? [],
          failed: false,
          groups: res.groups ?? [],
          hasMore: Boolean(res.has_more) || (tab === 'web' && (res.web?.results.length ?? 0) > 0 && !res.web?.unavailable),
          images: res.images?.results ?? [],
          infobox: res.web?.infobox ?? null,
          key,
          page: 1,
          users: res.users ?? [],
          web: res.web?.results ?? [],
          webDown: Boolean(res.web?.unavailable || res.images?.unavailable),
        });
      } catch (error) {
        console.error('Search failed', error);
        if (!cancelled) setBundle({ ...emptyBundle(key), failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, langCode, query, retry, tab]);

  // Музыка ищется отдельно (транслитерация, раскладка, сторонние сервисы — это медленнее сайтов) и появляется по готовности.
  useEffect(() => {
    if (!query || (tab !== 'web' && tab !== 'music')) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        const res = await AncialAPI.pulseSearch<Partial<MusicBundle>>(query);
        if (!cancelled) setMusic({ artists: res.artists ?? [], playlists: res.playlists ?? [], query, tracks: res.tracks ?? [] });
      } catch (error) {
        console.error('Music search failed', error);
        if (!cancelled) setMusic({ artists: [], playlists: [], query, tracks: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, retry, tab]);

  const current = bundle?.key === key ? bundle : null;
  const musicReady = music?.query === query ? music : null;
  const sideBox = tab === 'web' && current ? current.infobox : null;

  const loadMore = useCallback(async () => {
    if (!current || busyRef.current || !current.hasMore || tab === 'music') return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const res = await AncialAPI.search({ lang: langCode || 'ru', page: current.page + 1, q: query, type: tab });
      setBundle((latest) => {
        if (!latest || latest.key !== key) return latest;
        const web = mergeBy(latest.web, res.web?.results ?? [], (item) => item.url);
        const images = mergeBy(latest.images, res.images?.results ?? [], (item) => item.img);
        const users = mergeBy(latest.users, res.users ?? [], (item) => String(item.id));
        const groups = mergeBy(latest.groups, res.groups ?? [], (item) => String(item.id));
        const grew = web.length + images.length + users.length + groups.length > latest.web.length + latest.images.length + latest.users.length + latest.groups.length;
        return { ...latest, groups, hasMore: grew && Boolean(res.has_more), images, page: latest.page + 1, users, web };
      });
    } catch (error) {
      console.error('Search load more failed', error);
      setBundle((latest) => (latest && latest.key === key ? { ...latest, hasMore: false } : latest));
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [current, key, langCode, query, tab]);

  useLoadMoreObserver(sentinelRef, () => void loadMore(), [loadMore, current?.hasMore, current?.web.length, current?.images.length]);

  const onSearch = (input: string) => {
    const parsed = classifySearchInput(input);
    if (parsed.kind === 'url') {
      if (IS_NATIVE_APP) void openExternalUrl(parsed.url);
      else window.open(parsed.url, '_blank', 'noopener,noreferrer');
    } else if (parsed.kind === 'query') {
      router.push(searchHref(parsed.query, tab));
    }
  };

  const tabLabel = (value: SearchTab) => lang?.[`search_tab_${value}`] || { web: 'Интернет', images: 'Картинки', users: 'Люди', groups: 'Сообщества', music: 'Музыка' }[value];
  const goTab = (value: SearchTab) => router.replace(searchHref(query, value));

  const widgets = tab === 'web' && current ? (
    <>
      {current.users.length > 0 ? (
        <SearchSection title={lang?.search_tab_users || 'Люди'} lang={lang} onMore={() => goTab('users')}>
          <SearchRail>{current.users.map((user) => <PersonTile key={user.id} user={user} />)}</SearchRail>
        </SearchSection>
      ) : null}
      {current.groups.length > 0 ? (
        <SearchSection title={lang?.search_tab_groups || 'Сообщества'} lang={lang} onMore={() => goTab('groups')}>
          <SearchRail>{current.groups.map((group) => <GroupTile key={group.id} group={group} />)}</SearchRail>
        </SearchSection>
      ) : null}
      {musicReady && (musicReady.tracks.length > 0 || musicReady.artists.length > 0) ? <SearchMusic compact data={musicReady} lang={lang} onMore={() => goTab('music')} /> : null}
      {current.apps.length > 0 ? (
        <SearchSection title={lang?.search_widget_apps || 'Приложения'} lang={lang}>
          <SearchRail>{current.apps.map((app) => <AppTile key={app.id} app={app} />)}</SearchRail>
        </SearchSection>
      ) : null}
    </>
  ) : null;

  const nothing = (
    <div className="flex w-full flex-col items-center gap-3 p-6 text-center">
      <AppImage skeleton={false} src="/img/load-placeholders/nothingfound.webp" alt="" width={224} height={224} className="h-40 w-auto" />
      <span className="text-base font-black text-zinc-100">{lang?.search_no_results || 'Ничего не найдено'}</span>
      <span className="text-sm text-zinc-400">{lang?.search_no_results_hint || 'Попробуйте изменить запрос или проверить написание'}</span>
    </div>
  );

  let body: React.ReactNode = null;
  if (!query) {
    body = (
      <div className="flex w-full flex-col items-center gap-3 p-6 text-center text-zinc-400">
        <Icon name="IC-search" className="h-12 w-12 fill-zinc-700" />
        <span>{lang?.search_prompt || 'Введите запрос'}</span>
      </div>
    );
  } else if (tab === 'music') {
    body = !musicReady ? <ResultSkeleton round /> : musicReady.tracks.length + musicReady.artists.length + musicReady.playlists.length === 0 ? nothing : <SearchMusic compact={false} data={musicReady} lang={lang} />;
  } else if (!current) {
    body = <ResultSkeleton rows={tab === 'web' ? 6 : 4} round={tab === 'users' || tab === 'groups'} />;
  } else if (current.failed) {
    body = <ErrorState variant="block" onRetry={() => setRetry((value) => value + 1)} />;
  } else if (tab === 'web') {
    const hasAnything = current.web.length > 0 || current.users.length > 0 || current.groups.length > 0 || current.apps.length > 0 || (musicReady?.tracks.length ?? 0) > 0;
    body = (
      <>
        {widgets}
        {/* Под выдачей на ПК карточка живёт справа (aside ниже); на телефоне — над сайтами. */}
        {current.infobox ? <div className="lg:hidden"><InfoboxCard box={current.infobox} /></div> : null}
        {current.web.length > 0 ? (
          <div className="flex w-full flex-col gap-6">
            {current.web.map((result) => <WebResult key={result.url} result={result} />)}
          </div>
        ) : null}
        {current.webDown && current.web.length === 0 ? (
          <div className="flex w-full items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 text-sm text-zinc-300">
            <Icon name="IC-warning" className="h-6 w-6 shrink-0 fill-zinc-500" />
            {lang?.search_web_unavailable || 'Поиск в интернете сейчас недоступен'}
          </div>
        ) : null}
        {!hasAnything && !current.webDown && musicReady ? nothing : null}
      </>
    );
  } else if (tab === 'images') {
    body = current.images.length > 0 ? <ImageGrid images={current.images} onOpen={setViewerIndex} /> : current.webDown ? (
      <div className="w-full p-6 text-center text-sm text-zinc-400">{lang?.search_web_unavailable || 'Поиск в интернете сейчас недоступен'}</div>
    ) : nothing;
  } else if (tab === 'users') {
    body = current.users.length > 0 ? <div className="flex w-full flex-col gap-6">{current.users.map((user) => <PersonRow key={user.id} user={user} />)}</div> : nothing;
  } else {
    body = current.groups.length > 0 ? <div className="flex w-full flex-col gap-6">{current.groups.map((group) => <GroupRow key={group.id} group={group} />)}</div> : nothing;
  }

  return (
    <div className="flex w-full flex-col items-center p-3 pt-0 pb-24 lg:items-start lg:pb-6">
      <div className="sticky top-0 z-[30] flex w-full flex-col items-center gap-3 bg-gradient-to-b from-black via-black/90 to-transparent pt-3 lg:items-start">
        {/* Шапка как в классической выдаче: логотип слева, строка поиска правее (на телефоне — друг под другом). */}
        <div className="flex w-full flex-col items-center gap-3 lg:flex-row">
          {/* Логотип и строка «переезжают» сюда с главной (общие layoutId с home-content.tsx). */}
          <motion.div layoutId="home-logo" transition={{ type: 'spring', stiffness: 600, damping: 50 }} className="shrink-0">
            <Link href="/" className="block cursor-pointer duration-300 hover:opacity-90 active:scale-95" aria-label="Zypo">
              <AppImage width={120} height={48} loading="eager" src="/img/zypo/letter.svg" alt="Zypo" className="h-12 w-auto" />
            </Link>
          </motion.div>
          <motion.div layoutId="search-bar" transition={{ type: 'spring', stiffness: 600, damping: 50 }} className="relative z-[99999] flex w-full max-w-screen-md flex-col">
            <SearchBox key={query} initialValue={query} onSearch={onSearch} />
          </motion.div>
        </div>
        <div ref={tabsRef} role="tablist" aria-label={lang?.search_page_title || 'Поиск'} className="drag-scroll viewport -mx-3 flex w-[calc(100%+1.5rem)] flex-nowrap overflow-x-auto px-3 pb-3 lg:mx-0 lg:w-full lg:px-0">
          <div className="flex flex-shrink-0 flex-row flex-nowrap gap-3">
            {SEARCH_TABS.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => goTab(value)}
                className={cn(
                  'glass-panel [--glass-alpha:0] [--glass-sat:2] flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/30 px-3 py-2 text-lg duration-300 active:scale-95',
                  tab === value ? 'bg-zinc-700/80 text-white shadow' : 'bg-zinc-900/20 text-zinc-300 hover:bg-zinc-700 hover:text-white',
                )}
              >
                {tabLabel(value)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Выдача — колонкой до 700px у левого края, как раньше; сетка картинок шире. */}
      <div className={cn('flex w-full flex-col gap-6 lg:flex-row lg:items-start', tab === 'images' ? 'max-w-5xl' : sideBox ? 'max-w-[1100px]' : 'max-w-[700px]')}>
        <div className={cn('flex w-full min-w-0 flex-col gap-6', tab !== 'images' && 'max-w-[700px]')}>
          {body}
          <div ref={sentinelRef} className="h-px w-full" />
          {loadingMore ? (
            <div className="flex w-full justify-center p-3">
              <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-300" />
            </div>
          ) : null}
        </div>
        {sideBox ? (
          <aside className="hidden w-[360px] shrink-0 lg:sticky lg:top-40 lg:block">
            <InfoboxCard box={sideBox} stacked />
          </aside>
        ) : null}
      </div>

      <ImageViewerModal
        activeImageIndex={viewerIndex}
        images={(current?.images ?? []).map((image) => ({ alt: image.title, previewUrl: image.thumb, url: image.img }))}
        isOpen={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onNext={() => setViewerIndex((index) => (index === null || !current ? index : (index + 1) % current.images.length))}
        onPrev={() => setViewerIndex((index) => (index === null || !current ? index : (index - 1 + current.images.length) % current.images.length))}
      />
    </div>
  );
}
