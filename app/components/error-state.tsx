'use client';

import Link from 'next/link';

import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import AppImage from './app-image';
import Icon from './svg-icon';

const NOTHING_IMAGE = '/img/load-placeholders/nothingfound.webp';

/**
 * Единое состояние «не удалось загрузить»: иллюстрация, заголовок, пояснение и действия.
 * `page` — по центру экрана (страница целиком), `block` — карточка внутри страницы,
 * `inline` — компактно (выпадающие панели, окна). Действия: «Повторить» (`onRetry`) и ссылка (`actionHref`).
 */
export default function ErrorState({
  actionHref,
  actionLabel,
  description,
  image = NOTHING_IMAGE,
  onRetry,
  retryLabel,
  title,
  variant = 'block',
}: {
  actionHref?: string;
  actionLabel?: string;
  description?: string;
  /** Иллюстрация; по умолчанию — общая «ничего не найдено». */
  image?: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
  variant?: 'block' | 'inline' | 'page';
}) {
  const { lang } = useAuth();
  const heading = title || lang?.load_failed || 'Не удалось загрузить';
  const compact = variant === 'inline';

  return (
    <div
      role="alert"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 text-center text-zinc-100',
        // 5rem — нижняя навигация (pb-20 у main-content до lg), иначе страница выше экрана и появляется прокрутка
        variant === 'page' && 'min-h-[calc(100dvh-5rem)] lg:min-h-dvh p-3',
        variant === 'block' && 'rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6',
        compact && 'p-3',
      )}
    >
      {compact ? (
        <Icon name="IC-warning" className="h-8 w-8 fill-zinc-500" />
      ) : (
        <AppImage skeleton={false} src={image} alt="" width={224} height={224} className="h-56 w-auto" />
      )}
      <span className={cn('w-full font-black', compact ? 'text-sm' : 'text-base')}>{heading}</span>
      {description ? <span className="w-full text-sm font-medium text-zinc-300">{description}</span> : null}
      {onRetry || actionHref ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-full border border-zinc-600/30 bg-purple-700 px-4 py-2 text-zinc-100 duration-300 hover:bg-purple-600 active:scale-95"
            >
              {retryLabel || lang?.retry || 'Повторить'}
            </button>
          ) : null}
          {actionHref ? (
            <Link
              href={actionHref}
              className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 text-zinc-100 duration-300 hover:bg-zinc-700 active:scale-95"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
