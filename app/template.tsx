'use client';

import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const animationKey = pathname.startsWith('/messages') ? 'messages' : pathname;

  return (
    <div key={animationKey} className="flex-1 flex flex-col animate-page-enter">
      {children}
    </div>
  );
}