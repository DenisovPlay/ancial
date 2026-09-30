'use client';

import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createRouteScrollController, scrollAppToTop } from '../lib/route-scroll';
import { cn } from '../lib/cn';
import { ensureHtmlImageLoading } from '../lib/image-loading';
import { isRestoreNavigation } from '../lib/entry-nav';
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

  // Внутренние ссылки в тексте постов и сообщений (a[data-internal]) — переход без перезагрузки страницы.
  // Клики с модификаторами и средняя кнопка остаются браузеру (новая вкладка/окно).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[data-internal]');
      const href = anchor?.getAttribute('href');
      if (!anchor || !href || !href.startsWith('/') || anchor.target === '_blank') return;
      event.preventDefault();
      router.push(href);
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
    </div>
  );
}
