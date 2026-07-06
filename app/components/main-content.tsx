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
          scrollAppToTop('smooth');
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
        'flex-1 flex flex-col lg:pl-24 duration-300',
        !isPulsePlaylistPage && 'pb-20 lg:pb-0',
      )}
    >
      {children}
    </div>
  );
}
