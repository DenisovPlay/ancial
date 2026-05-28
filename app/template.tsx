'use client';

import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const rootSegment = pathname.split('/')[1] || '';

  return (
    <div key={rootSegment} className="flex-1 flex flex-col animate-page-enter">
      {children}
    </div>
  );
}