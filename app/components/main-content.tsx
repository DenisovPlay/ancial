'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPulsePlaylistPage = /^\/pulse\/playlist\/[^/]+\/?$/.test(pathname || '');

  return (
    <div
      id="main-content"
      className={cn(
        'flex-1 flex flex-col md:pl-24 duration-300',
        !isPulsePlaylistPage && 'pb-20 md:pb-0',
      )}
    >
      {children}
    </div>
  );
}
