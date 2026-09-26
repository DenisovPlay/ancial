import { Suspense } from 'react';

import CallInviteClient from './call-invite-client';
import { AppRouteGate } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';

// Приложение: одна страница-заготовка, параметр берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ code: 'param' });

export const metadata = {
  title: 'Приглашение в звонок',
};

export default function CallInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh w-full items-center justify-center bg-black text-white">…</div>}>
      <AppRouteGate>
        <CallInviteClient />
      </AppRouteGate>
    </Suspense>
  );
}
