import { Suspense } from 'react';
import CallClient from './call-client';
import { AppRouteGate } from '../../components/app-route-shell';
import { appShellStaticParams } from '../../lib/app-shell-params';

// Приложение: одна страница-заготовка, параметр берётся из адреса (app-routes.ts).
export const generateStaticParams = appShellStaticParams({ hash: 'param' });

export const metadata = {
  title: 'Call',
};

export default function CallPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-black"><span className="text-white">Loading...</span></div>}>
      <AppRouteGate>
        <CallClient />
      </AppRouteGate>
    </Suspense>
  );
}
