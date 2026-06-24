'use client';

import { usePathname } from 'next/navigation';

export default function PulseTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex flex-1 flex-col animate-page-enter">
      {children}
    </div>
  );
}
