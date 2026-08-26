import { Suspense } from 'react';

import GuestCallClient from './guest-call-client';

export const metadata = {
  title: 'Приглашение в звонок',
};

export default function CallInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh w-full items-center justify-center bg-black text-white">…</div>}>
      <GuestCallClient />
    </Suspense>
  );
}
