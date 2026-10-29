'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import AppImage from '../../components/app-image';
import ErrorState from '../../components/error-state';
import ImageViewerModal from '../../components/image-viewer-modal';
import Icon from '../../components/svg-icon';
import { useAuth } from '../../context/AuthContext';
import { useLoadMoreObserver } from '../../hooks/use-load-more-observer';
import { apiUrl } from '../../lib/api-url';
import { cn } from '../../lib/cn';
import { toInternalPath } from '../../lib/internal-link';
import { formatRelativeTime } from '../../lib/time';
import { normalizeAssetUrl } from '../lib/messages-shared';
import type { DialogMediaKind, useDialogMedia } from '../lib/use-dialog-media';
import ChatTrackList from './chat-track-list';

/** Общие куски окон «Информация о чате» (личный диалог и беседа): плитки действий, список разделов, экран содержимого. */

/** Плитка действия под именем (профиль, звонок, звук, закрепление, пригласить…). */
export function ActionTile({ active, children, danger, label, onClick }: { active?: boolean; children: ReactNode; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-3xl border border-zinc-600/30 px-1.5 py-3 text-xs duration-300 active:scale-95',
        danger
          ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
          : active ? 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center">{children}</span>
      <span className="w-full truncate text-center">{label}</span>
    </button>
  );
}

export interface InfoSection<T extends string> {
  bg: string;
  count?: number;
  fill: string;
  icon: string;
  key: T;
  label: string;
}

/** Список разделов одним блоком: иконка, название, шеврон; каждый раздел открывается своим экраном. */
export function InfoSectionList<T extends string>({ onOpen, sections }: { onOpen: (key: T) => void; sections: InfoSection<T>[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-800/40">
      {sections.map(({ bg, count, fill, icon, key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onOpen(key)}
          className="flex w-full cursor-pointer items-center gap-3 p-3 text-left duration-300 hover:bg-zinc-800 active:scale-95"
        >
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', bg)}>
            <Icon name={icon} className={cn('h-6 w-6', fill)} />
          </span>
          <span className="min-w-0 flex-1 truncate text-white">{label}</span>
          {count !== undefined ? <span className="shrink-0 text-sm text-zinc-400">{count}</span> : null}
          <Icon name="IC-chevron-right" className="h-6 w-6 shrink-0 fill-zinc-500" />
        </button>
      ))}
    </div>
  );
}

/** Три раздела содержимого переписки: те же цвета и иконки у обоих окон. */
export function useMediaSections(): Array<InfoSection<DialogMediaKind>> {
  const { lang } = useAuth();
  return [
    { bg: 'bg-sky-500/15', fill: 'fill-sky-400', icon: 'IC-photos', key: 'media', label: lang?.chat_info_media || 'Медиа' },
    { bg: 'bg-emerald-500/15', fill: 'fill-emerald-400', icon: 'IC-link', key: 'links', label: lang?.chat_info_links || 'Ссылки' },
    { bg: 'bg-pink-500/15', fill: 'fill-pink-400', icon: 'IC-music', key: 'tracks', label: lang?.chat_info_tracks || 'Треки' },
  ];
}

/** Экран «Медиа» / «Ссылки» / «Треки»: список, догрузка страницами, состояния загрузки, ошибки и пустоты. */
export function DialogMediaPane({ isOpen, kind, media }: { isOpen: boolean; kind: DialogMediaKind; media: ReturnType<typeof useDialogMedia> }) {
  const { lang } = useAuth();
  const { loadMore, state } = media;
  const current = state[kind];
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && !current.loaded && !current.loading) loadMore(kind);
  }, [current.loaded, current.loading, isOpen, kind, loadMore]);

  useLoadMoreObserver(sentinelRef, () => loadMore(kind), [kind, current.items.length, current.hasMore, current.loading, isOpen]);

  const emptyTexts: Record<DialogMediaKind, string> = {
    links: lang?.chat_info_links_empty || 'Ссылки из переписки появятся здесь',
    media: lang?.chat_info_media_empty || 'Фото из переписки появятся здесь',
    tracks: lang?.chat_info_tracks_empty || 'Треки из переписки появятся здесь',
  };
  const slides = useMemo(
    () => state.media.items.map((item) => {
      const url = apiUrl(normalizeAssetUrl(item.url, ''));
      return { alt: '', previewUrl: url, url };
    }),
    [state.media.items],
  );

  return (
    <div className="flex flex-col gap-3">
      {current.items.length > 0 ? (
        kind === 'media' ? (
          <div className="grid grid-cols-3 gap-1.5">
            {state.media.items.map((item, index) => (
              <button
                key={`${item.message_id}-${index}`}
                type="button"
                onClick={() => setViewerIndex(index)}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-zinc-800 duration-300 hover:opacity-80 active:scale-95"
              >
                <AppImage fill sizes="(max-width: 640px) 30vw, 180px" src={apiUrl(normalizeAssetUrl(item.url, ''))} alt="" className="object-cover" />
              </button>
            ))}
          </div>
        ) : kind === 'links' ? (
          <div className="flex flex-col gap-1.5">
            {state.links.items.map((item, index) => {
              const url = item.url ?? '';
              const internal = toInternalPath(url);
              return (
                <a
                  key={`${item.message_id}-${index}`}
                  href={internal ?? `/redirect?link=${encodeURIComponent(url)}`}
                  {...(internal ? {} : { rel: 'noopener noreferrer', target: '_blank' })}
                  className="flex cursor-pointer items-center gap-3 rounded-3xl p-1.5 duration-300 hover:bg-zinc-800 active:scale-95"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                    <Icon name="IC-link" className="h-6 w-6 fill-zinc-200" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-white">{item.host || url}</span>
                    <span className="truncate text-sm text-purple-300">{url}</span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{formatRelativeTime(item.date, lang, '')}</span>
                </a>
              );
            })}
          </div>
        ) : (
          <ChatTrackList trackIds={state.tracks.items.map((item) => item.track_id ?? 0).filter(Boolean)} />
        )
      ) : null}

      {current.loading && current.items.length === 0 ? (
        <div className="flex justify-center py-6">
          <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-300" />
        </div>
      ) : null}
      {current.failed ? <ErrorState variant="inline" onRetry={() => loadMore(kind)} /> : null}
      {current.loaded && !current.failed && current.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">{emptyTexts[kind]}</p>
      ) : null}
      {current.hasMore && current.items.length > 0 ? (
        <div ref={sentinelRef} className="flex justify-center py-1.5">
          {current.loading ? <Icon name="IC-loader" className="h-5 w-5 animate-spin fill-zinc-300" /> : null}
        </div>
      ) : null}

      <ImageViewerModal
        activeImageIndex={viewerIndex}
        images={slides}
        isOpen={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onNext={() => {
          // Дошли до конца загруженных — подгружаем следующую страницу фото.
          if (viewerIndex !== null && viewerIndex >= slides.length - 2) loadMore('media');
          setViewerIndex((index) => (index === null ? null : Math.min(index + 1, slides.length - 1)));
        }}
        onPrev={() => setViewerIndex((index) => (index === null ? null : Math.max(index - 1, 0)))}
      />
    </div>
  );
}
