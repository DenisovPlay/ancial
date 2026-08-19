import { Suspense } from 'react';

import GroupCallClient from './group-call-client';

export const metadata = {
  title: 'Group call',
};

export default function GroupCallPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh w-full items-center justify-center bg-black text-white">Loading…</div>}>
      <GroupCallClient />
    </Suspense>
  );
}
