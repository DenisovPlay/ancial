'use client';

import React, { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { createRouteScrollController, scrollAppToTop } from '../lib/route-scroll';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
    routeScrollController.syncRoute(routeKey);
  }, [routeKey, routeScrollController]);

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
