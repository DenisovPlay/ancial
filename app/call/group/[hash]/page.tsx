import { Suspense } from 'react';

import GroupCallClient from './group-call-client';
import { AppRouteGate } from '../../../components/app-route-shell';
import { appShellStaticParams } from '../../../lib/app-shell-params';

// Приложение: одна страница-заготовка, параметр берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ hash: 'param' });

export const metadata = {
  title: 'Group call',
};

export default function GroupCallPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh w-full items-center justify-center bg-black text-white">Loading…</div>}>
      <AppRouteGate>
        <GroupCallClient />
      </AppRouteGate>
    </Suspense>
  );
}
