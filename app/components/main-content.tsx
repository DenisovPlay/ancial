'use client';

import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createRouteScrollController, scrollAppToTop } from '../lib/route-scroll';
import { cn } from '../lib/cn';
import { ensureHtmlImageLoading } from '../lib/image-loading';
import { isRestoreNavigation } from '../lib/entry-nav';
import { toInternalPath } from '../lib/internal-link';
import { openLinkGuard, parseRedirectHref } from '../lib/link-guard-store';
import LinkGuardHost from './link-guard-host';
import { installScrollRestore } from '../lib/scroll-restore';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPulsePlaylistPage = /^\/pulse\/playlist\/[^/]+\/?$/.test(pathname || '');
  const isCinemaPage = pathname?.startsWith('/cinema');
  const routeKey = pathname.startsWith('/messages') ? '/messages' : pathname;
  const routeScrollController = useMemo(
    () =>
      createRouteScrollController({
        schedule: (callback) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(callback);
          });
        },
        scrollToTop: () => {
          scrollAppToTop('instant');
        },
      }),
    []
  );

  useEffect(() => {
    routeScrollController.syncRoute(routeKey, isRestoreNavigation());
  }, [routeKey, routeScrollController]);

  // Возврат на то же место при «Назад/Вперёд» (позиция хранится по записи истории).
  useEffect(() => installScrollRestore(), []);

  // Ссылки в тексте постов и сообщений без перезагрузки страницы:
  //  - a[data-internal] — наш же сайт, обычный SPA-переход;
  //  - a[href^="/redirect?"] — внешний сайт, проверка открывается окном на месте (страница /redirect остаётся запасной:
  //    средняя кнопка, Ctrl/Cmd/Shift-клик и «открыть в новой вкладке» работают как раньше).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[data-internal], a[href^="/redirect?"]');
      const href = anchor?.getAttribute('href');
      if (!anchor || !href || anchor.closest('[contenteditable="true"]')) return;

      if (anchor.hasAttribute('data-internal')) {
        if (!href.startsWith('/') || anchor.target === '_blank') return;
        event.preventDefault();
        router.push(href);
        return;
      }

      const link = parseRedirectHref(href);
      if (!link) return;
      event.preventDefault();
      const internalPath = toInternalPath(link);
      if (internalPath) router.push(internalPath);
      else openLinkGuard(link);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  // Прелоадер картинок внутри HTML-строк (посты, комментарии, стикеры) — один раз на приложение.
  useEffect(() => {
    ensureHtmlImageLoading();
  }, []);

  return (
    <div
      id="main-content"
      className={cn(
        'flex-1 flex flex-col duration-300 bg-black',
        !isCinemaPage && 'lg:pl-24',
        !isPulsePlaylistPage && !isCinemaPage && 'pb-20 lg:pb-0',
      )}
    >
      {children}
      <LinkGuardHost />
    </div>
  );
}
