'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import AccountName from '../components/account-name';
import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';
import { useDragScroll } from '../hooks/useDragScroll';
import { cn } from '../lib/cn';
import type { SearchApp, SearchGroup, SearchImageResult, SearchInfobox, SearchUser, SearchWebResult } from '../lib/search-types';

type Lang = Record<string, string> | null | undefined;

export const userHref = (user: SearchUser) => `/@${user.username}`;
export const groupHref = (group: SearchGroup) => `/$${group.slnk}`;

/** Заголовок блока выдачи со ссылкой «Показать все» (если есть куда вести). */
export function SearchSection({ children, lang, onMore, title }: { children: ReactNode; lang: Lang; onMore?: () => void; title: string }) {
  return (
    <section className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100 lg:text-xl">{title}</h2>
        {onMore ? (
          <button type="button" onClick={onMore} className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-zinc-300 duration-300 hover:bg-zinc-800 hover:text-white active:scale-95">
            {lang?.search_show_all || 'Показать все'}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Лента карточек по горизонтали с перетаскиванием мышью (мини-виджеты над выдачей). */
export function SearchRail({ children }: { children: ReactNode }) {
  const ref = useDragScroll({ speed: 2 });
  return (
    <div ref={ref} className="drag-scroll viewport -mx-3 flex w-[calc(100%+1.5rem)] flex-nowrap overflow-x-auto px-3 lg:mx-0 lg:w-full lg:px-0">
      <div className="flex flex-shrink-0 flex-row flex-nowrap gap-3">{children}</div>
    </div>
  );
}

export function PersonTile({ user }: { user: SearchUser }) {
  return (
    <Link href={userHref(user)} className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 duration-300 active:scale-95">
      <AppImage width={64} height={64} src={user.img || '/img/placeholders/user.png'} fallbackSrc="/img/placeholders/user.png" alt="" className="block h-16 w-16 rounded-full border border-zinc-600/30 object-cover shadow" />
      <span className="w-20 truncate text-center text-sm text-zinc-300">{user.name || user.username}</span>
    </Link>
  );
}

export function GroupTile({ group }: { group: SearchGroup }) {
  return (
    <Link href={groupHref(group)} className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 duration-300 active:scale-95">
      <AppImage width={64} height={64} src={group.img || '/img/placeholders/group.png'} fallbackSrc="/img/placeholders/group.png" alt="" className="block h-16 w-16 rounded-full border border-zinc-600/30 object-cover shadow" />
      <span className="w-20 truncate text-center text-sm text-zinc-300">{group.name}</span>
    </Link>
  );
}

export function AppTile({ app }: { app: SearchApp }) {
  return (
    <Link href={`/apps?q=${encodeURIComponent(app.name)}`} className="flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 duration-300 active:scale-95">
      <AppImage width={64} height={64} src={app.img || '/img/placeholders/group.png'} fallbackSrc="/img/placeholders/group.png" alt="" className="block h-16 w-16 rounded-3xl border border-zinc-600/30 object-cover shadow" />
      <span className="w-20 truncate text-center text-sm text-zinc-300">{app.name}</span>
    </Link>
  );
}

/** Строка человека во вкладке «Люди». */
export function PersonRow({ user }: { user: SearchUser }) {
  return (
    <Link href={userHref(user)} className="rounded-3xl p-0 transition-[padding,margin,background-color] duration-300 hover:-my-3 hover:bg-zinc-900 hover:p-3 flex w-full cursor-pointer items-center gap-3 duration-300 active:scale-[0.99]">
      <AppImage width={56} height={56} src={user.img || '/img/placeholders/user.png'} fallbackSrc="/img/placeholders/user.png" alt="" className="block h-14 w-14 shrink-0 rounded-full border border-zinc-600/30 object-cover" />
      <span className="flex min-w-0 flex-col">
        <AccountName user={user} className="text-zinc-100 lg:text-lg font-medium" nameClassName="truncate text-zinc-100 lg:text-lg font-medium" />
        <span className="truncate text-sm text-zinc-400">@{user.username}</span>
      </span>
    </Link>
  );
}

/** Строка сообщества во вкладке «Сообщества». */
export function GroupRow({ group }: { group: SearchGroup }) {
  return (
    <Link href={groupHref(group)} className="rounded-3xl p-0 transition-[padding,margin,background-color] duration-300 hover:-my-3 hover:bg-zinc-900 hover:p-3 flex w-full cursor-pointer items-center gap-3 duration-300 active:scale-[0.99]">
      <AppImage width={56} height={56} src={group.img || '/img/placeholders/group.png'} fallbackSrc="/img/placeholders/group.png" alt="" className="block h-14 w-14 shrink-0 rounded-full border border-zinc-600/30 object-cover" />
      <span className="flex min-w-0 flex-col">
        <AccountName user={{ name: group.name, verify: group.verify, type: 'group' }} className="text-zinc-100 lg:text-lg font-medium" nameClassName="truncate text-zinc-100 lg:text-lg font-medium" />
        {group.desk ? <span className="line-clamp-2 text-sm text-zinc-400">{group.desk}</span> : null}
      </span>
    </Link>
  );
}

/** Сайт в выдаче: адрес, заголовок-ссылка, описание. */
export function WebResult({ result }: { result: SearchWebResult }) {
  return (
    <a href={result.url} target="_blank" rel="noopener noreferrer" className="group flex w-full min-w-0 cursor-pointer flex-col gap-1.5 rounded-3xl p-0 transition-[padding,margin,background-color] duration-300 [overflow-wrap:anywhere] hover:-my-3 hover:bg-zinc-900 hover:p-3">
      <span className="flex min-w-0 items-center gap-3 text-sm text-zinc-400">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <Icon name="IC-globe" className="h-4 w-4 fill-zinc-300" />
        </span>
        <span className="truncate">{result.host}</span>
      </span>
      <span className="text-lg font-medium text-purple-300 group-hover:underline lg:text-xl">{result.title}</span>
      {result.snippet ? <span className="line-clamp-3 text-sm text-zinc-300 lg:text-base">{result.snippet}</span> : null}
    </a>
  );
}

/** Карточка энциклопедии над выдачей (инфобокс SearXNG). */
export function InfoboxCard({ box, stacked = false }: { box: SearchInfobox; stacked?: boolean }) {
  // Широкая картинка (логотип 1553×270) в квадрате с object-cover превращается в обрезок, а прозрачный логотип
  // с чёрным текстом на тёмной карточке не виден: широкие кадры показываем целиком на светлой подложке.
  const [wide, setWide] = useState(false);
  return (
    <div className={cn('flex w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3', !stacked && !wide && 'sm:flex-row')}>
      {box.img ? (
        <span className={cn('block shrink-0 overflow-hidden rounded-3xl', wide ? 'w-full bg-white p-3' : stacked ? 'w-full' : 'h-32 w-32')}>
          <AppImage
            width={stacked ? 336 : 256}
            height={stacked ? 224 : 256}
            src={box.img}
            alt=""
            onLoad={(event) => {
              const { naturalHeight, naturalWidth } = event.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) setWide(naturalWidth / naturalHeight > 1.6);
            }}
            className={cn('block w-full', wide ? 'h-24 object-contain' : cn('object-cover', stacked ? 'h-56' : 'h-32'))}
          />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-xl font-semibold text-zinc-100">{box.title}</h2>
        <p className={cn('text-sm text-zinc-300 lg:text-base', stacked ? 'line-clamp-[12]' : 'line-clamp-5')}>{box.content}</p>
        {box.links.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {box.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-full border border-zinc-600/30 px-3 py-1.5 text-xs text-zinc-200 duration-300 hover:bg-zinc-800 active:scale-95">
                {link.title}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Сетка картинок: колонки по высоте, пропорции кадра сохраняются; клик открывает просмотрщик. */
export function ImageGrid({ images, onOpen }: { images: SearchImageResult[]; onOpen: (index: number) => void }) {
  return (
    <div className={cn('w-full', IMAGE_COLUMNS)}>
      {images.map((image, index) => (
        <button
          key={image.img}
          type="button"
          onClick={() => onOpen(index)}
          className="group relative mb-3 block w-full break-inside-avoid cursor-pointer overflow-hidden rounded-3xl border border-zinc-600/30 bg-zinc-900 duration-300 active:scale-95"
        >
          <AppImage
            width={image.width > 0 ? Math.min(image.width, 480) : 480}
            height={image.width > 0 && image.height > 0 ? Math.round((Math.min(image.width, 480) * image.height) / image.width) : 320}
            sizes="(max-width: 640px) 50vw, 25vw"
            src={image.thumb}
            alt={image.title}
            className="block h-auto w-full object-cover"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pb-1.5 pt-6 text-xs text-zinc-200 opacity-0 duration-300 group-hover:opacity-100">
            {image.host}
          </span>
        </button>
      ))}
    </div>
  );
}

const IMAGE_SKELETON_HEIGHTS = ['h-40', 'h-56', 'h-32', 'h-48', 'h-36', 'h-52', 'h-44', 'h-60', 'h-36', 'h-48', 'h-40', 'h-56', 'h-32', 'h-52', 'h-44', 'h-36'];

/** Колонки картинок: на ПК занимают всю ширину, поэтому колонок больше. */
export const IMAGE_COLUMNS = 'columns-2 gap-3 sm:columns-3 lg:columns-5 2xl:columns-6';

/** Скелетон под вкладку «Интернет»: адрес, заголовок и три строки описания, как у WebResult. */
export function WebSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-6 pt-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex w-full flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-3 w-1/4 animate-pulse rounded-full bg-zinc-800" />
          </div>
          <div className={cn('h-6 animate-pulse rounded-full bg-zinc-800', index % 2 ? 'w-2/3' : 'w-4/5')} />
          <div className="h-3.5 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3.5 w-full animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

/** Скелетон под вкладку «Картинки»: колонки разной высоты, как у готовой сетки. */
export function ImageGridSkeleton() {
  return (
    <div className={cn('w-full', IMAGE_COLUMNS)}>
      {IMAGE_SKELETON_HEIGHTS.map((height, index) => (
        <div key={index} className={cn('mb-3 w-full break-inside-avoid animate-pulse rounded-3xl bg-zinc-800', height)} />
      ))}
    </div>
  );
}

/** Скелетон под вкладки «Люди» и «Сообщества»: круглый аватар и две строки. */
export function PeopleSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-6 pt-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex w-full items-center gap-3">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-zinc-800" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className={cn('h-5 animate-pulse rounded-full bg-zinc-800', index % 2 ? 'w-1/3' : 'w-1/2')} />
            <div className="h-3.5 w-1/4 animate-pulse rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Скелетон под вкладку «Музыка»: карточка со строками треков (обложка, название, исполнитель). */
export function TracksSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex w-full items-center gap-3">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-3xl bg-zinc-800" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className={cn('h-4 animate-pulse rounded-full bg-zinc-800', index % 2 ? 'w-1/3' : 'w-1/2')} />
            <div className="h-3 w-1/4 animate-pulse rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
