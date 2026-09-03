'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useDragScroll } from '../../hooks/useDragScroll';
import { ActionIcon, cn } from '../pulse-components';

export default function PulseCreateLayout({ children }: { children: React.ReactNode }) {
  const { lang, isAuthenticated } = useAuth();
  const pathname = usePathname();

  const navScrollRef = useDragScroll({ speed: 2 });
  const leftGradRef = useRef<HTMLDivElement | null>(null);
  const rightGradRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    const updateGradients = () => {
      const canScrollLeft = el.scrollLeft > 4;
      const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      if (leftGradRef.current) {
        leftGradRef.current.style.opacity = canScrollLeft ? '1' : '0';
      }
      if (rightGradRef.current) {
        rightGradRef.current.style.opacity = canScrollRight ? '1' : '0';
      }
    };

    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateGradients();
      });
    };

    updateGradients();

    el.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleUpdate) : null;
    ro?.observe(el);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      ro?.disconnect();
    };
  }, [navScrollRef]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const container = navScrollRef.current;
      const activeButton = container?.querySelector<HTMLElement>('[data-topic-active="true"]');

      if (!container || !activeButton) return;

      const scrollLeft =
        activeButton.offsetLeft - container.offsetWidth / 2 + activeButton.offsetWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [pathname, navScrollRef]);

  if (isAuthenticated === false) {
    return null;
  }

  const tabs = [
    { path: '/pulse/create', label: lang?.creators_overview || 'Обзор' },
    { path: '/pulse/create/artists', label: lang?.artists || 'Артисты' },
    { path: '/pulse/create/albums', label: lang?.albums || 'Альбомы' },
    { path: '/pulse/create/tracks', label: lang?.tracks || 'Треки' },
    { path: '/about/contacts', label: lang?.support || 'Поддержка' },
  ];

  return (
    <div className="flex flex-col justify-start items-center gap-3 pb-24 duration-300 min-h-screen">
      <div
        className="w-full flex items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent pt-3"
        style={{ zIndex: 20 }}
      >
        <div className="w-full max-w-screen-2xl px-3 lg:px-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/pulse/my"
              aria-label={lang?.creators_back_to_pulse || 'Вернуться в Pulse'}
              className="flex items-center gap-3 hover:opacity-80 duration-300 cursor-pointer active:scale-95"
            >
              <ActionIcon className="w-8 h-8 fill-white shrink-0" name="IC-chevron-left" />
              <img src="/img/logos/creators.svg" alt="Creators" className="h-6 sm:h-7 object-contain shrink-0" />
            </Link>
          </div>

          <Link
            href="/pulse/create/upload"
            className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 duration-300 flex items-center gap-2 shadow shrink-0"
          >
            <ActionIcon className="w-4 h-4 fill-black" name="IC-plus" />
            <span>{lang?.creators_upload_release || 'Новый релиз'}</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3 duration-300 max-w-screen-2xl">
        <div className="relative w-full sticky top-0 py-3 -my-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40 flex items-center">
          <div
            ref={leftGradRef}
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 hidden w-16 bg-gradient-to-r from-black to-transparent opacity-0 transition-opacity duration-300 lg:block"
          />
          <div
            ref={rightGradRef}
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 hidden w-16 bg-gradient-to-l from-black to-transparent opacity-0 transition-opacity duration-300 lg:block"
          />
          <div
            ref={navScrollRef}
            className="drag-scroll overflow-x-auto viewport px-3 lg:px-0 w-full flex flex-nowrap gap-3"
          >
            {tabs.map((tab) => {
              const isActive = pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  data-topic-active={isActive ? 'true' : 'false'}
                  className={cn(
                    'text-lg px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 active:scale-95 duration-300 rounded-full',
                    isActive
                      ? 'bg-zinc-700/80 text-white shadow'
                      : 'bg-zinc-900/20 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="px-3 lg:px-0 w-full flex flex-col gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}
